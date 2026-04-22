import type { Campaign, Entry, Payout } from './storage';
import type { ProfileSettings } from './github-db';
import { fRp, fN } from './helpers';

function escapeMd(s: string): string {
  return s.replace(/[_*`\[\]()~>#+\-=|{}.!\\]/g, m => '\\' + m);
}

// Use application/x-www-form-urlencoded to avoid CORS preflight (which Telegram API
// sometimes rejects, causing "Failed to fetch" in browsers).
function tgBody(params: Record<string, string>): URLSearchParams {
  const usp = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) usp.append(k, v);
  return usp;
}

export async function sendTelegram(text: string, settings: ProfileSettings): Promise<boolean> {
  if (!settings.telegramEnabled) return false;
  const token = (settings.telegramBotToken || '').trim();
  const chatId = (settings.telegramChatId || '').trim();
  if (!token || !chatId) return false;
  try {
    const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST',
      body: tgBody({
        chat_id: chatId,
        text,
        parse_mode: 'MarkdownV2',
        disable_web_page_preview: 'true',
      }),
    });
    return res.ok;
  } catch { return false; }
}

export function buildEntryMessage(opts: {
  profileName: string;
  campaign: Campaign | undefined;
  entry: Omit<Entry, 'id'>;
  isEdit: boolean;
  allEntries?: Entry[];
}): string {
  const { profileName, campaign, entry, isEdit, allEntries } = opts;
  const profit = (entry.revenue || 0) - (entry.spend || 0);
  const roi = entry.spend ? (profit / entry.spend) * 100 : 0;
  const profitIcon = profit > 0 ? '🟢' : profit < 0 ? '🔴' : '⚪';
  const title = isEdit ? '✏️ *Entri Diperbarui*' : '📝 *Entri Baru Tercatat*';
  const cpName = campaign?.name || 'Tanpa Campaign';
  const platform = campaign?.platform || '-';

  const lines = [
    title,
    '',
    `👤 Akun: *${escapeMd(profileName)}*`,
    `📅 Tanggal: \`${escapeMd(entry.date || '')}\``,
    `📣 Campaign: *${escapeMd(cpName)}* \\(${escapeMd(platform)}\\)`,
    '',
    `💸 Spend: \`${escapeMd(fRp(entry.spend || 0))}\``,
    `💰 Revenue: \`${escapeMd(fRp(entry.revenue || 0))}\``,
    `${profitIcon} Profit: \`${escapeMd((profit >= 0 ? '+' : '') + fRp(profit))}\``,
    `📈 ROI: \`${escapeMd((roi >= 0 ? '+' : '') + roi.toFixed(2) + '%')}\``,
    `🖱 Klik: \`${escapeMd(fN(entry.adclicks || 0))}\``,
  ];
  if (entry.note) lines.push('', `📝 _${escapeMd(entry.note)}_`);

  // Summary (all-time totals across the profile)
  if (allEntries && allEntries.length > 0) {
    const dates = allEntries.map(e => e.date).filter(Boolean).sort();
    const dateMin = dates[0] || '-';
    const dateMax = dates[dates.length - 1] || '-';
    let totSpend = 0, totRev = 0;
    for (const e of allEntries) { totSpend += e.spend || 0; totRev += e.revenue || 0; }
    const totProfit = totRev - totSpend;
    const totRoi = totSpend ? (totProfit / totSpend) * 100 : 0;
    const totIcon = totProfit > 0 ? '🟢' : totProfit < 0 ? '🔴' : '⚪';

    lines.push(
      '',
      `━━━━━━━━━━━━━━`,
      `📊 *Ringkasan Keseluruhan*`,
      `🗓 Periode: \`${escapeMd(dateMin)}\` → \`${escapeMd(dateMax)}\``,
      `💸 Total Spend: \`${escapeMd(fRp(totSpend))}\``,
      `💰 Total Penghasilan: \`${escapeMd(fRp(totRev))}\``,
      `${totIcon} Profit Bersih: \`${escapeMd((totProfit >= 0 ? '+' : '') + fRp(totProfit))}\``,
      `📈 ROI Total: \`${escapeMd((totRoi >= 0 ? '+' : '') + totRoi.toFixed(2) + '%')}\``,
      `📂 Jumlah Entri: \`${escapeMd(String(allEntries.length))}\``,
    );
  }

  return lines.join('\n');
}

export function buildPayoutMessage(opts: {
  profileName: string;
  payout: Payout;
  kind: 'created-sukses' | 'pending-to-sukses';
  totalSukses: number;
  totalPending: number;
  countSukses: number;
}): string {
  const { profileName, payout, kind, totalSukses, totalPending, countSukses } = opts;
  const title = kind === 'pending-to-sukses'
    ? '✅ *Payout CAIR\\!*'
    : '💵 *Payout Sukses Tercatat*';
  const lines = [
    title,
    '',
    `👤 Akun: *${escapeMd(profileName)}*`,
    `📅 Tanggal PO: \`${escapeMd(payout.date)}\``,
    `💰 Nominal: *${escapeMd(fRp(payout.amount))}*`,
  ];
  if (payout.bankName || payout.accountNo || payout.accountHolder) {
    lines.push('', '🏦 *Rekening Tujuan*');
    if (payout.bankName) lines.push(`• Bank: ${escapeMd(payout.bankName)}`);
    if (payout.accountNo) lines.push(`• No: \`${escapeMd(payout.accountNo)}\``);
    if (payout.accountHolder) lines.push(`• a\\.n\\.: ${escapeMd(payout.accountHolder)}`);
  }
  if (payout.note) lines.push('', `📝 _${escapeMd(payout.note)}_`);
  lines.push(
    '',
    '━━━━━━━━━━━━━━',
    '📊 *Akumulasi Payout*',
    `✅ Total Cair: \`${escapeMd(fRp(totalSukses))}\` \\(${escapeMd(fN(countSukses))}x\\)`,
    `⏳ Masih Pending: \`${escapeMd(fRp(totalPending))}\``,
  );
  return lines.join('\n');
}

export async function fetchChatIdFromBot(botToken: string): Promise<{ ok: boolean; chatId?: string; chatTitle?: string; error?: string }> {
  const token = (botToken || '').trim();
  if (!token) return { ok: false, error: 'Bot token wajib diisi dulu' };
  if (!/^\d+:[A-Za-z0-9_-]+$/.test(token)) {
    return { ok: false, error: 'Format token salah (harus: angka:huruf, contoh 123456:ABC...)' };
  }
  try {
    const res = await fetch(`https://api.telegram.org/bot${token}/getUpdates`, { method: 'GET' });
    if (!res.ok) {
      const j = await res.json().catch(() => ({} as any));
      return { ok: false, error: j.description || `HTTP ${res.status} — token salah?` };
    }
    const j = await res.json();
    if (!j.ok) return { ok: false, error: j.description || 'API error' };
    const updates: any[] = j.result || [];
    if (updates.length === 0) {
      return { ok: false, error: 'Belum ada pesan ke bot. Buka chat bot di Telegram & kirim /start dulu, lalu coba lagi.' };
    }
    // Take the most recent message's chat
    for (let i = updates.length - 1; i >= 0; i--) {
      const u = updates[i];
      const chat = u.message?.chat || u.channel_post?.chat || u.edited_message?.chat;
      if (chat?.id) {
        const title = chat.title || chat.username || [chat.first_name, chat.last_name].filter(Boolean).join(' ') || 'Chat';
        return { ok: true, chatId: String(chat.id), chatTitle: title };
      }
    }
    return { ok: false, error: 'Tidak menemukan chat di update terbaru. Kirim /start ke bot dulu.' };
  } catch (e) {
    return { ok: false, error: (e as Error).message + ' — pastikan token valid & koneksi internet aktif' };
  }
}

export async function testTelegram(settings: ProfileSettings, profileName: string): Promise<{ ok: boolean; error?: string }> {
  const token = (settings.telegramBotToken || '').trim();
  const chatId = (settings.telegramChatId || '').trim();
  if (!token || !chatId) return { ok: false, error: 'Bot token & chat ID wajib diisi' };
  try {
    const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST',
      body: tgBody({
        chat_id: chatId,
        text: `✅ Test dari AdJournal — akun *${escapeMd(profileName)}* berhasil terhubung\\!`,
        parse_mode: 'MarkdownV2',
      }),
    });
    if (res.ok) return { ok: true };
    const j = await res.json().catch(() => ({} as any));
    return { ok: false, error: j.description || `HTTP ${res.status}` };
  } catch (e) {
    const msg = (e as Error).message || 'Network error';
    return { ok: false, error: msg + ' — cek format token (123456:ABC...) & chat ID (angka, dari @userinfobot)' };
  }
}
