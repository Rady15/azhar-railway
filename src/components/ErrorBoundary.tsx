// @ts-nocheck - React base typings do not expose state/setState to subclasses here
import React from 'react';

/**
 * Catches render-time crashes anywhere below it and shows what actually went
 * wrong, instead of leaving a blank white page with an empty console. React
 * unmounts the whole tree on an uncaught render error, which is what makes
 * these failures so hard to diagnose from the UI alone.
 */
type Props = { children: React.ReactNode };
type State = { error: Error | null; info: string };

export class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { error: null, info: '' };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { error };
  }

  componentDidCatch(error: Error, info: { componentStack?: string | null }) {
    this.setState({ error, info: info?.componentStack || '' });
    // also surface it in the console so DevTools shows it
    console.error('[ErrorBoundary]', error, info?.componentStack);
  }

  private reset = () => this.setState({ error: null, info: '' });

  render() {
    const { error, info } = this.state;
    if (!error) return this.props.children as any;

    const frame = (info || '').trim().split('\n').slice(1, 4).join('\n');

    return (
      <div dir="rtl" style={{
        minHeight: '100vh', padding: 24, background: '#fef2f2', color: '#7f1d1d',
        fontFamily: 'system-ui, Tahoma, sans-serif', fontSize: 14, lineHeight: 1.7,
      }}>
        <div style={{ maxWidth: 720, margin: '0 auto' }}>
          <h1 style={{ fontSize: 22, margin: '0 0 6px' }}>حدث خطأ في الواجهة</h1>
          <p style={{ margin: '0 0 18px', color: '#991b1b', fontSize: 13 }}>
            الصفحة ما قدرتش تعرض. التفاصيل تحت — انسخها لو محتاجة مساعدة.
          </p>

          <div style={{ background: '#fff', border: '1px solid #fecaca', borderRadius: 12, padding: 16, marginBottom: 14 }}>
            <div style={{ fontSize: 11, letterSpacing: 1, color: '#b91c1c', fontWeight: 700, marginBottom: 8 }}>
              MESSAGE
            </div>
            <pre style={{
              margin: 0, whiteSpace: 'pre-wrap', wordBreak: 'break-word',
              fontFamily: 'ui-monospace, Menlo, monospace', fontSize: 13, color: '#7f1d1d',
            }}>{error.message}</pre>
          </div>

          {frame && (
            <div style={{ background: '#fff', border: '1px solid #fecaca', borderRadius: 12, padding: 16, marginBottom: 14 }}>
              <div style={{ fontSize: 11, letterSpacing: 1, color: '#b91c1c', fontWeight: 700, marginBottom: 8 }}>
                WHERE
              </div>
              <pre style={{
                margin: 0, whiteSpace: 'pre-wrap', wordBreak: 'break-word',
                fontFamily: 'ui-monospace, Menlo, monospace', fontSize: 11, color: '#991b1b',
              }}>{frame}</pre>
            </div>
          )}

          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <button
              onClick={this.reset}
              style={{ background: '#dc2626', color: '#fff', border: 0, borderRadius: 9, padding: '10px 18px', font: '600 13px system-ui', cursor: 'pointer' }}
            >
              إعادة المحاولة
            </button>
            <button
              onClick={() => { sessionStorage.clear(); localStorage.clear(); location.href = '/'; }}
              style={{ background: '#fff', color: '#7f1d1d', border: '1px solid #fecaca', borderRadius: 9, padding: '10px 18px', font: '600 13px system-ui', cursor: 'pointer' }}
            >
              مسح الجلسة والدخول من جديد
            </button>
          </div>
        </div>
      </div>
    );
  }
}

export default ErrorBoundary;