/* Page-to-page transition: a short terminal session that pings and curls the
 * target page before navigating. Shared by every page; it injects its own CSS
 * so a page only needs the one script tag.
 *
 * ponytail: the output is scripted, not a real request — a browser cannot ICMP
 * ping, and a real HEAD would add latency for a decorative effect.
 */
(() => {
  const PROMPT = 'hikari@ops:~$ ';
  const TYPE_MS = 12, LINE_MS = 90, HOLD_MS = 220;
  const HOST = 'hikari.security';

  const css = `
.nav-transition{position:fixed;inset:0;z-index:100000;background:#08090b;color:#f2f1ef;
padding:26px 28px;overflow:hidden;
font:13px/1.55 ui-monospace,SFMono-Regular,Menlo,Consolas,monospace}
.nav-transition .prompt{color:#8f9092}
.nav-transition .cmd{color:#f2f1ef}
.nav-transition .result{color:#a4a5a7}
.nav-transition span{display:block;white-space:pre-wrap;word-break:break-word}
.nav-transition span.inline{display:inline}
.nav-cursor{display:inline-block;width:.6em;height:1.05em;margin-left:1px;vertical-align:text-bottom;
background:#f2f1ef;animation:nav-cursor 1s steps(1,end) infinite}
@keyframes nav-cursor{50%{opacity:0}}
@media(max-width:580px){.nav-transition{padding:20px 14px;font-size:11px}}`;

  const style = document.createElement('style');
  style.textContent = css;
  document.head.append(style);

  const slug = href => (href.split('/').pop() || '').replace(/\.html$/, '') || 'index';
  const reduced = () => matchMedia('(prefers-reduced-motion: reduce)').matches;

  function script(path) {
    const ms = (8 + Math.random() * 20).toFixed(1);
    return [
      [`ping -c 1 ${HOST}`,
       `64 bytes from ${HOST}: icmp_seq=1 ttl=57 time=${ms} ms`],
      [`curl -sI https://${HOST}/${path}`,
       `HTTP/2 200\ncontent-type: text/html; charset=utf-8\nserver: hikari-edge`],
    ];
  }

  /* Drive the typing from elapsed time in one rAF loop, and make a single
   * timeout the authority on navigating. Per-character setTimeout gets clamped
   * (unfocused tabs, busy pages) and would stretch a 1s transition into six. */
  function play(href) {
    const root = document.createElement('div');
    root.className = 'nav-transition';
    root.setAttribute('role', 'status');
    root.setAttribute('aria-live', 'polite');
    document.body.append(root);

    const steps = script(slug(href));
    const cursor = document.createElement('span');
    cursor.className = 'nav-cursor inline';

    const timeline = [];
    let at = 0;
    for (const [command, result] of steps) {
      const line = document.createElement('span');
      const prompt = document.createElement('span');
      prompt.className = 'prompt inline';
      prompt.textContent = PROMPT;
      const cmd = document.createElement('span');
      cmd.className = 'cmd inline';
      line.append(prompt, cmd);
      const out = document.createElement('span');
      out.className = 'result';
      out.textContent = result;
      timeline.push({ line, cmd, out, command, start: at, end: at + command.length * TYPE_MS });
      at += command.length * TYPE_MS + LINE_MS * 2;
    }
    const total = at + HOLD_MS;

    const t0 = performance.now();
    let done = false;
    const finish = () => { if (!done) { done = true; location.href = href; } };
    setTimeout(finish, total);

    (function frame(now) {
      if (done) return;
      const t = now - t0;
      for (const step of timeline) {
        if (t < step.start) break;
        if (!step.line.isConnected) root.append(step.line);
        const chars = Math.min(step.command.length,
          Math.floor((t - step.start) / TYPE_MS));
        if (step.cmd.textContent.length !== chars) {
          step.cmd.textContent = step.command.slice(0, chars);
        }
        if (chars >= step.command.length && t >= step.end + LINE_MS && !step.out.isConnected) {
          root.append(step.out);
        }
        root.append(cursor);
      }
      requestAnimationFrame(frame);
    })(t0);
  }

  addEventListener('click', event => {
    if (event.defaultPrevented || event.button !== 0) return;
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    const link = event.target.closest('a[href]');
    if (!link || link.target === '_blank' || link.hasAttribute('download')) return;

    const url = new URL(link.getAttribute('href'), location.href);
    if (url.origin !== location.origin) return;
    if (!/\.html$/.test(url.pathname)) return;           // in-page anchors keep native behaviour
    if (url.pathname === location.pathname) return;
    if (reduced()) return;                                // navigate straight through

    event.preventDefault();
    play(url.href);
  });
})();
