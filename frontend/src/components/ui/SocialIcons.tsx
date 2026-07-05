/** Icon Zalo/Telegram/Discord đơn giản, tự vẽ bằng SVG — không cần cài thêm
 * thư viện ngoài (tránh rủi ro lúc deploy), nhưng vẫn nhận diện được ngay. */

export function ZaloIcon({ size = 22 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48">
      <rect width="48" height="48" rx="11" fill="#0068FF" />
      <path d="M13 30 V19.5 C13 15 16.5 12 20.5 12 H27.5 C31.9 12 35 15 35 19 C35 23 31.9 26 27.5 26 H19"
        fill="none" stroke="#fff" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M13 30 L19 25.5" stroke="#fff" strokeWidth="2.6" strokeLinecap="round" />
      <circle cx="20.5" cy="19" r="1.6" fill="#fff" />
      <circle cx="27" cy="19" r="1.6" fill="#fff" />
    </svg>
  );
}

export function TelegramIcon({ size = 22 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48">
      <circle cx="24" cy="24" r="24" fill="#29A9EA" />
      <path d="M35.5 14.5 L11.5 23.7 c-1.5.6-1.5 1.5-.3 1.9l6.1 1.9 2.4 7.3c.3.8.5 1.1 1 1.1.5 0 .7-.2 1.1-.6l3-2.9 6.2 4.6c1.1.6 1.9.3 2.2-1.1l4-18.8c.4-1.8-.6-2.5-1.7-2.1z"
        fill="#fff" />
      <path d="M18.9 27.9l14.1-8.9c.7-.4 1.3-.2.8.3l-11.8 10.7-.5 5.1-1-.1-1.6-7.1z" fill="#C7E4F7" />
    </svg>
  );
}

export function DiscordIcon({ size = 22 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48">
      <circle cx="24" cy="24" r="24" fill="#5865F2" />
      <path d="M32.5 16.8c-1.8-.9-3.7-1.5-5.7-1.8l-.3.6c1.8.4 3.5 1 5 1.9-2.5-1.2-5.1-1.8-7.7-1.8s-5.2.6-7.7 1.8c1.5-.9 3.2-1.5 5-1.9l-.3-.6c-2 .3-3.9.9-5.7 1.8-3 4.4-3.8 8.7-3.4 12.9 1.9 1.4 3.8 2.3 5.6 2.9l.7-1.2c-1-.4-2-.9-2.8-1.5.2.1.5.3.7.4 3.6 1.8 7.2 1.8 10.7 0 .3-.1.5-.3.7-.4-.9.6-1.8 1.1-2.8 1.5l.7 1.2c1.9-.6 3.7-1.5 5.6-2.9.5-4.9-.8-9.1-3.4-12.9zM18.9 27.4c-1.1 0-2.1-1.1-2.1-2.4s.9-2.4 2.1-2.4 2.1 1.1 2.1 2.4-.9 2.4-2.1 2.4zm9.9 0c-1.1 0-2.1-1.1-2.1-2.4s.9-2.4 2.1-2.4 2.1 1.1 2.1 2.4-.9 2.4-2.1 2.4z"
        fill="#fff" />
    </svg>
  );
}
