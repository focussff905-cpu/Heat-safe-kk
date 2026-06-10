import webpush from 'web-push';
import { createClient } from '@supabase/supabase-js';

const VAPID_PUBLIC  = 'BPK1ArKe9auD9PmUHEyqKDJv-Y_tucS3I73HCpGIIZSskw2_FnvxKqYxk2I4V9nVROtEtQbLDBdr63cAkMx1UnY';
const VAPID_PRIVATE = process.env.VAPID_PRIVATE_KEY;
const VAPID_EMAIL   = process.env.VAPID_EMAIL ?? 'mailto:admin@kkmap.app';
const KK_LAT  = 16.4322;
const KK_LNG  = 102.8359;
const KK_WMO  = '48381';

// Scheduled notification times (ICT) — every 3h from 06:30 + 11:30 + 15:00
const SCHEDULED_TIMES = [
  { h:  0, m: 30 },
  { h:  6, m: 30 },
  { h:  9, m: 30 },
  { h: 11, m: 30 },
  { h: 12, m: 30 },
  { h: 15, m:  0 },
  { h: 15, m: 30 },
  { h: 18, m: 30 },
  { h: 21, m: 30 },
];

// Thresholds for threshold-crossing alerts
const THR = {
  uv:       [3, 6, 8, 11],   // moderate / high / very high / extreme
  pm25:     [37, 75, 150],   // moderate / unhealthy / very unhealthy (µg/m³)
  humidity: [50, 80],        // moderate / high
  temp:     [32, 35, 38],    // hot / very hot / dangerous
  rainfall: [5, 20],         // light / moderate (mm/3h)
};

// Minimum change to trigger a "data changed" notification
const CHANGE = { temp: 2, humidity: 10, uv: 1, pm25: 15 };

webpush.setVapidDetails(VAPID_EMAIL, VAPID_PUBLIC, VAPID_PRIVATE);

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

// ── XML helper (Node.js has no DOMParser) ───────────────────────────────────
function xmlVal(block, tag) {
  const m = block.match(new RegExp(`<${tag}>([\\s\\S]*?)<\\/${tag}>`));
  return m ? m[1].trim() : null;
}

// ── Fetch + parse TMD 3-hour observation for station 48381 ──────────────────
async function fetchTMD() {
  const xml = await fetch(
    'https://data.tmd.go.th/api/Weather3Hours/v2/?uid=api&ukey=api12345'
  ).then(r => r.text());

  const blocks = xml.split('<Station>').slice(1);
  for (const b of blocks) {
    if (/WmoStationNumber[^>]*>[\s]*48381[\s]*</.test(b)) {
      const num = t => { const v = parseFloat(xmlVal(b, t)); return isNaN(v) ? null : v; };
      return {
        temperature: num('Temperature'),
        humidity:    num('RelativeHumidity'),
        windSpeed:   num('WindSpeed'),
        windDir:     num('WindDirection'),
        rainfall:    num('Rainfall'),
        pressure:    num('MeanSeaLevelPressure'),
      };
    }
  }
  return null;
}

// ── Fetch UV index + PM2.5 from Open-Meteo (supplementary) ─────────────────
// TMD does not publish UV/PM2.5 through their 3-hour observation API.
// Open-Meteo uses ERA5/GFS atmospheric models consistent with WMO standards.
async function fetchOpenMeteo() {
  const [wxRes, aqRes] = await Promise.allSettled([
    fetch(
      `https://api.open-meteo.com/v1/forecast?latitude=${KK_LAT}&longitude=${KK_LNG}` +
      `&current=apparent_temperature,uv_index&timezone=Asia%2FBangkok`
    ).then(r => r.json()),
    fetch(
      `https://air-quality-api.open-meteo.com/v1/air-quality?latitude=${KK_LAT}&longitude=${KK_LNG}` +
      `&current=pm2_5&timezone=Asia%2FBangkok`
    ).then(r => r.json()),
  ]);
  return {
    feelsLike: wxRes.status === 'fulfilled' ? (wxRes.value.current?.apparent_temperature ?? null) : null,
    uvIndex:   wxRes.status === 'fulfilled' ? (wxRes.value.current?.uv_index ?? null) : null,
    pm25:      aqRes.status === 'fulfilled' ? (aqRes.value.current?.pm2_5 ?? null) : null,
  };
}

// ── Fetch TMD weather warnings for Northeast / Khon Kaen ───────────────────
async function fetchTMDWarnings() {
  const alerts = [];
  try {
    // Try TMD weather warning API (XML)
    const xml = await fetch(
      'https://data.tmd.go.th/api/WeatherWarning3Hours/v2/?uid=api&ukey=api12345'
    ).then(r => r.text());

    // Look for warnings mentioning Northeast or Khon Kaen
    const kw = ['ขอนแก่น', 'ตะวันออกเฉียงเหนือ', 'ภาคอีสาน', 'northeast', 'khon kaen'];
    const blocks = xml.split('<Warning>').slice(1);
    for (const b of blocks) {
      const text = xmlVal(b, 'WarningText') ?? xmlVal(b, 'Description') ?? '';
      if (kw.some(k => text.toLowerCase().includes(k.toLowerCase()))) {
        alerts.push(text.slice(0, 800));
      }
    }
  } catch { /* ignore — warning API may not be available */ }
  return alerts;
}

// ── Classify level (returns index into thresholds array, -1 if below all) ──
function level(value, thresholds) {
  if (value == null) return -1;
  let l = -1;
  for (let i = 0; i < thresholds.length; i++) {
    if (value >= thresholds[i]) l = i;
  }
  return l;
}

// ── Build notification payload from current conditions ──────────────────────
function buildNotification(data, reasons) {
  const { temp, humidity, feelsLike, uvIndex, pm25, rainfall } = data;
  const now = new Date().toLocaleString('th-TH', {
    hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Bangkok',
  });

  // ── Severe weather warning ───────────────────────────────────────────────
  if (reasons.includes('warning')) {
    return {
      title: `🌪️ ${now} · ประกาศเตือนภัยอากาศ TMD`,
      body: data.warnings?.[0] ?? 'มีประกาศเตือนภัยสภาพอากาศร้ายแรงในพื้นที่ขอนแก่น',
    };
  }

  // ── Build contextual lines ───────────────────────────────────────────────
  const lines = [];

  // Temperature
  const tl = level(temp, THR.temp);
  const tempStr = temp != null ? `${temp}°C` : '—';
  const feelStr = feelsLike != null ? ` (รู้สึก ${Math.round(feelsLike)}°C)` : '';

  if (tl === 2) lines.push(`🌡️ อุณหภูมิ ${tempStr}${feelStr} — อันตราย งดกิจกรรมกลางแจ้ง`);
  else if (tl === 1) lines.push(`🌡️ อุณหภูมิ ${tempStr}${feelStr} — ร้อนมาก ดื่มน้ำให้เพียงพอ`);
  else if (tl === 0) lines.push(`🌡️ อุณหภูมิ ${tempStr}${feelStr} — พักดื่มน้ำบ้าง`);
  else lines.push(`🌡️ อุณหภูมิ ${tempStr}${feelStr}`);

  // UV
  if (uvIndex != null) {
    const ul = level(uvIndex, THR.uv);
    const uvLabels = ['ปานกลาง ทาครีมกันแดด', 'สูง ลดเวลากลางแจ้ง', 'สูงมาก สวมเสื้อและหมวก', 'สุดขีด หลีกเลี่ยงกลางแจ้ง'];
    if (ul >= 0) lines.push(`☀️ UV ${uvIndex.toFixed(1)} — ${uvLabels[ul]}`);
    else lines.push(`☀️ UV ${uvIndex.toFixed(1)} — ปลอดภัย`);
  }

  // PM2.5
  if (pm25 != null) {
    const pl = level(pm25, THR.pm25);
    const pmLabels = ['ปานกลาง กลุ่มเสี่ยงระวัง', 'ไม่ดีต่อสุขภาพ สวมหน้ากาก', 'อันตราย งดกิจกรรมกลางแจ้ง'];
    if (pl >= 0) lines.push(`💨 ฝุ่น PM2.5 ${Math.round(pm25)} µg/m³ — ${pmLabels[pl]}`);
    else lines.push(`💨 ฝุ่น PM2.5 ${Math.round(pm25)} µg/m³ — ดี`);
  }

  // Humidity
  if (humidity != null) {
    const hl = level(humidity, THR.humidity);
    if (hl === 1) lines.push(`💧 ความชื้น ${humidity}% — สูงมาก ระบายความร้อนยาก`);
    else if (hl === 0) lines.push(`💧 ความชื้น ${humidity}%`);
    else lines.push(`💧 ความชื้น ${humidity}%`);
  }

  // Rainfall
  if (rainfall != null && rainfall > 0) {
    const rl = level(rainfall, THR.rainfall);
    if (rl === 1) lines.push(`🌧️ ฝนตกหนัก ${rainfall} มม. ระวังน้ำท่วมขัง`);
    else lines.push(`🌦️ มีฝนเล็กน้อย ${rainfall} มม.`);
  }

  // Choose title emoji and severity
  const tl2 = level(temp, THR.temp);
  const ul2  = level(uvIndex, THR.uv);
  const pl2  = level(pm25,    THR.pm25);
  const maxSeverity = Math.max(tl2, ul2, pl2);

  let titleEmoji;
  if (maxSeverity >= 2)      titleEmoji = '🚨';
  else if (maxSeverity >= 1) titleEmoji = '⚠️';
  else if (tl2 >= 0 || ul2 >= 0 || pl2 >= 0) titleEmoji = '😷';
  else                       titleEmoji = temp >= 28 ? '😊' : '😁';

  const reasonLabel = {
    scheduled:  `สรุปสภาพอากาศ ${now}`,
    threshold:  `แจ้งเตือน ${now}`,
    change:     `ข้อมูลเปลี่ยนแปลง ${now}`,
  };

  return {
    title: `${titleEmoji} ${reasonLabel[reasons[0]] ?? now} · ${tempStr}`,
    body:  lines.join('\n'),
  };
}

// ── Send push to all subscribers ────────────────────────────────────────────
async function sendToAll(notification) {
  const { data: subs } = await supabase
    .from('push_subscriptions')
    .select('endpoint, p256dh, auth');
  if (!subs?.length) return { sent: 0, failed: 0 };

  const payload = JSON.stringify({ ...notification, url: '/' });
  const results = await Promise.allSettled(
    subs.map(s =>
      webpush.sendNotification(
        { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
        payload
      ).catch(async err => {
        if (err.statusCode === 410 || err.statusCode === 404) {
          await supabase.from('push_subscriptions').delete().eq('endpoint', s.endpoint);
        }
        throw err;
      })
    )
  );
  return {
    sent:   results.filter(r => r.status === 'fulfilled').length,
    failed: results.filter(r => r.status === 'rejected').length,
  };
}

// ── Main handler ─────────────────────────────────────────────────────────────
export default async function handler(req, res) {
  // Verify Vercel cron secret
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret && req.headers['authorization'] !== `Bearer ${cronSecret}`) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  if (!VAPID_PRIVATE) {
    res.status(503).json({ error: 'VAPID_PRIVATE_KEY not set' });
    return;
  }

  // Current ICT time
  const ictNow    = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Bangkok' }));
  const ictHour   = ictNow.getHours();
  const ictMinute = ictNow.getMinutes();

  // ── Fetch all data in parallel ───────────────────────────────────────────
  const [tmd, omData, warnings, stateRow] = await Promise.allSettled([
    fetchTMD(),
    fetchOpenMeteo(),
    fetchTMDWarnings(),
    supabase.from('notification_state').select('*').eq('id', 1).maybeSingle(),
  ]);

  const tmdData  = tmd.status      === 'fulfilled' ? tmd.value      : null;
  const om       = omData.status   === 'fulfilled' ? omData.value   : {};
  const warnList = warnings.status === 'fulfilled' ? warnings.value : [];
  const prevState = stateRow.status === 'fulfilled' ? stateRow.value?.data : null;

  const data = {
    temp:      tmdData?.temperature ?? null,
    humidity:  tmdData?.humidity    ?? null,
    windSpeed: tmdData?.windSpeed   ?? null,
    rainfall:  tmdData?.rainfall    ?? null,
    feelsLike: om.feelsLike ?? null,
    uvIndex:   om.uvIndex   ?? null,
    pm25:      om.pm25      ?? null,
    warnings:  warnList,
  };

  const { temp, humidity, uvIndex, pm25, rainfall } = data;

  // ── Determine why to send ────────────────────────────────────────────────
  const reasons = [];

  // 1. Severe weather warning from TMD
  if (warnList.length > 0 && warnList[0] !== prevState?.last_warning) {
    reasons.push('warning');
  }

  // 2. Threshold crossing (value just crossed a threshold compared to last state)
  if (prevState) {
    const crossed = (curr, prev, thresholds) => {
      if (curr == null || prev == null) return false;
      return thresholds.some(t => (prev < t && curr >= t) || (prev >= t && curr < t));
    };
    if (crossed(uvIndex,   prevState.uv_index,  THR.uv))       reasons.push('threshold');
    if (crossed(pm25,      prevState.pm25,       THR.pm25))     reasons.push('threshold');
    if (crossed(humidity,  prevState.humidity,   THR.humidity))  reasons.push('threshold');
    if (crossed(temp,      prevState.temp,       THR.temp))      reasons.push('threshold');
    if (crossed(rainfall,  prevState.rainfall,   THR.rainfall))  reasons.push('threshold');
  }

  // 3. Significant data change
  if (prevState && !reasons.length) {
    const changed = (curr, prev, delta) => curr != null && prev != null && Math.abs(curr - prev) >= delta;
    if (
      changed(temp,      prevState.temp,     CHANGE.temp) ||
      changed(humidity,  prevState.humidity,  CHANGE.humidity) ||
      changed(uvIndex,   prevState.uv_index,  CHANGE.uv) ||
      changed(pm25,      prevState.pm25,      CHANGE.pm25)
    ) {
      reasons.push('change');
    }
  }

  // 4. Scheduled notification time
  const isScheduled = SCHEDULED_TIMES.some(t => t.h === ictHour && t.m === ictMinute);
  if (isScheduled && !reasons.includes('scheduled')) reasons.push('scheduled');

  // ── Only minimum conditions to send at non-scheduled times ──────────────
  // At non-scheduled times: only send for warnings, threshold crossings, or big changes
  const shouldSend = reasons.some(r => ['warning', 'threshold', 'scheduled'].includes(r)) ||
    (reasons.includes('change') && isScheduled);

  if (!shouldSend) {
    res.status(200).json({ skipped: true, ictHour, reasons });
    return;
  }

  // ── Build and send notification ──────────────────────────────────────────
  const notification = buildNotification(data, reasons);
  const { sent, failed } = await sendToAll(notification);

  // ── Save current state to Supabase ──────────────────────────────────────
  await supabase.from('notification_state').upsert({
    id:           1,
    temp:         temp,
    humidity:     humidity,
    uv_index:     uvIndex,
    pm25:         pm25,
    rainfall:     rainfall,
    last_warning: warnList[0] ?? null,
    notified_at:  new Date().toISOString(),
  }, { onConflict: 'id' });

  res.status(200).json({ ok: true, sent, failed, reasons, ictHour, ictMinute, notification });
}
