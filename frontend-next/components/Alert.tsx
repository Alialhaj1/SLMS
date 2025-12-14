type Props = {
  type?: 'error' | 'success' | 'info';
  children: React.ReactNode;
};

export default function Alert({ type = 'info', children }: Props) {
  const bg = type === 'error' ? '#ffecec' : type === 'success' ? '#e6ffed' : '#eef6ff';
  const color = type === 'error' ? '#9a1f1f' : type === 'success' ? '#166534' : '#064e8a';
  return (
    <div style={{ background: bg, color, padding: 12, borderRadius: 6, marginBottom: 12 }}>
      {children}
    </div>
  );
}
