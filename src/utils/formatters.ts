export function formatCurrency(amount: number, symbol = '$'): string {
  return `${symbol}${amount.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',')}`;
}

export function formatDate(dateStr: string): string {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

export function formatDateTime(dateStr: string): string {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function generateOrderNumber(): string {
  const now = new Date();
  const year = now.getFullYear().toString().slice(-2);
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const rand = Math.floor(Math.random() * 9000) + 1000;
  return `ORD-${year}${month}${day}-${rand}`;
}

export function generateInvoiceNumber(): string {
  const now = new Date();
  const year = now.getFullYear().toString().slice(-2);
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const rand = Math.floor(Math.random() * 9000) + 1000;
  return `INV-${year}${month}-${rand}`;
}

export function generateQuoteNumber(): string {
  const now = new Date();
  const year = now.getFullYear().toString().slice(-2);
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const rand = Math.floor(Math.random() * 9000) + 1000;
  return `QUO-${year}${month}-${rand}`;
}

export function statusColor(status: string): string {
  const map: Record<string, string> = {
    pending: '#F59E0B',
    confirmed: '#3B82F6',
    in_production: '#8B5CF6',
    ready: '#10B981',
    delivered: '#6B7280',
    cancelled: '#EF4444',
    draft: '#9CA3AF',
    sent: '#3B82F6',
    paid: '#10B981',
    overdue: '#EF4444',
    accepted: '#10B981',
    rejected: '#EF4444',
    expired: '#9CA3AF',
  };
  return map[status] ?? '#9CA3AF';
}

export function capitalise(str: string): string {
  if (!str) return '';
  return str.charAt(0).toUpperCase() + str.slice(1).replace(/_/g, ' ');
}
