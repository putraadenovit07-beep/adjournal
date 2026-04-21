import type { Campaign, Entry } from './storage';
import type { ProfileSettings } from './github-db';
import { fRp, fN } from './helpers';

function escapeMd(s: string): string {
  return s.replace(/[_*`\[\]()~>#+\-=|{}.!\\]/g, m => '\\' + m);
}

export async function sendTelegram(text: string, settings: ProfileSettings): Promise<boolean> {
  if (!settings.telegramEnabled) return false;
  const token = (settings.telegramBotToken || '').trim();
  const chatId = (settings.telegramChatId || '').trim();
  if (!token || !chatId) return false;
  try {
    const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text,
        parse_mode: 'MarkdownV2',
        disable_web_page_preview: true,
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
}): string {
  const { profileName, campaign, entry, isEdit } = opts;
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
  return lines.join('\n');
}

export async function testTelegram(settings: ProfileSettings, profileName: string): Promise<{ ok: boolean; error?: string }> {
  const token = (settings.telegramBotToken || '').trim();
  const chatId = (settings.telegramChatId || '').trim();
  if (!token || !chatId) return { ok: false, error: 'Bot token & chat ID wajib diisi' };
  try {
    const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text: `✅ Test dari AdJournal — akun *${escapeMd(profileName)}* berhasil terhubung\\!`,
        parse_mode: 'MarkdownV2',
      }),
    });
    if (res.ok) return { ok: true };
    const j = await res.json().catch(() => ({} as any));
    return { ok: false, error: j.description || `HTTP ${res.status}` };
  } catch (e) { return { ok: false, error: (e as Error).message }; }
}
