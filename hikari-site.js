/* Hikari — shared behaviour for the inner pages.
   Mobile nav, phone-mask by country and client-side contact validation.
   Every block guards for its own markup so the file is safe on any page. */

(() => {
  'use strict';

  /* ── Mobile navigation ─────────────────────────────────────── */
  const nav = document.querySelector('.nav');
  const toggle = document.querySelector('.navtoggle');

  if (nav && toggle) {
    const setOpen = (open) => {
      nav.classList.toggle('open', open);
      toggle.setAttribute('aria-expanded', String(open));
      toggle.textContent = open ? 'Fechar' : 'Menu';
    };

    toggle.addEventListener('click', () => {
      setOpen(toggle.getAttribute('aria-expanded') !== 'true');
    });

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && nav.classList.contains('open')) {
        setOpen(false);
        toggle.focus();
      }
    });

    // A resize past the breakpoint leaves the panel stale otherwise.
    matchMedia('(min-width:901px)').addEventListener('change', (e) => {
      if (e.matches) setOpen(false);
    });
  }

  /* ── Toast ─────────────────────────────────────────────────── */
  const toast = document.querySelector('#toast');
  let toastTimer = 0;

  const notify = (message) => {
    if (!toast) return;
    toast.textContent = message;
    toast.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toast.classList.remove('show'), 4200);
  };

  /* ── Phone field: the rule differs between Brazil and abroad ─ */
  const country = document.querySelector('.phone-field select');
  const phone = document.querySelector('.phone-field input');

  if (country && phone) {
    const syncPhoneRule = () => {
      const brazil = country.value === '+55';
      phone.placeholder = brazil ? 'DDD + número' : 'Número local';
      phone.pattern = brazil ? '[0-9]{10,11}' : '[0-9]{6,15}';
      phone.maxLength = brazil ? 11 : 15;
      phone.title = brazil
        ? 'Digite o DDD de 2 dígitos e o número, somente números'
        : 'Digite o número local, somente números';
    };

    country.addEventListener('change', syncPhoneRule);
    phone.addEventListener('input', () => {
      phone.value = phone.value.replace(/\D/g, '').slice(0, phone.maxLength);
    });
    syncPhoneRule();
  }

  /* ── Contact form ──────────────────────────────────────────── */
  const form = document.querySelector('#contactForm');

  if (form) {
    const errorBox = form.querySelector('.form-error');
    const submit = form.querySelector('button[type="submit"]');

    const showError = (message, field) => {
      if (errorBox) errorBox.textContent = message;
      if (field) field.focus();
    };

    form.addEventListener('submit', (e) => {
      e.preventDefault();
      if (errorBox) errorBox.textContent = '';

      const data = new FormData(form);
      const name = String(data.get('nome') || '').trim();
      const email = String(data.get('email') || '').trim();
      const message = String(data.get('mensagem') || '').trim();
      const consent = form.querySelector('input[name="consentimento"]');

      if (name.length < 2) {
        return showError('Informe seu nome.', form.elements.nome);
      }
      // Deliberately permissive: the real check is the reply that bounces or not.
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) {
        return showError('Informe um e-mail válido.', form.elements.email);
      }
      if (phone && !phone.checkValidity()) {
        return showError('Confira o telefone: somente números, no formato do país escolhido.', phone);
      }
      if (message.length < 20) {
        return showError('Descreva o contexto em pelo menos 20 caracteres — ajuda a responder com precisão.', form.elements.mensagem);
      }
      if (consent && !consent.checked) {
        return showError('É preciso autorizar o contato para enviar.', consent);
      }

      // No backend is wired yet: the submit is acknowledged locally only.
      if (submit) {
        submit.disabled = true;
        submit.setAttribute('aria-busy', 'true');
      }

      setTimeout(() => {
        form.reset();
        if (country && phone) country.dispatchEvent(new Event('change'));
        if (submit) {
          submit.disabled = false;
          submit.removeAttribute('aria-busy');
        }
        notify('Recebido. Respondemos em até 1 dia útil com os próximos passos.');
      }, 500);
    });
  }

  /* ── Newsletter signup (blog) ──────────────────────────────── */
  const subForm = document.querySelector('#subForm');

  if (subForm) {
    const subError = subForm.querySelector('.form-error');

    subForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const field = subForm.elements.email;
      const value = String(field.value || '').trim();

      if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(value)) {
        if (subError) subError.textContent = 'Informe um e-mail válido.';
        field.focus();
        return;
      }

      if (subError) subError.textContent = '';
      subForm.reset();
      notify('Assinatura registrada. O próximo envio sai no fim do mês.');
    });
  }

  /* ── Blog filter ───────────────────────────────────────────── */
  const filters = document.querySelectorAll('[data-filter]');
  const posts = document.querySelectorAll('.postlist li[data-tags]');

  if (filters.length && posts.length) {
    const counter = document.querySelector('#postCount');

    const apply = (value) => {
      let visible = 0;
      posts.forEach((post) => {
        const tags = (post.dataset.tags || '').split(/\s+/);
        const match = value === 'todos' || tags.includes(value);
        post.hidden = !match;
        if (match) visible++;
      });
      filters.forEach((btn) => {
        btn.setAttribute('aria-pressed', String(btn.dataset.filter === value));
      });
      if (counter) {
        counter.textContent = `${visible} ${visible === 1 ? 'artigo' : 'artigos'}`;
      }
    };

    filters.forEach((btn) => {
      btn.addEventListener('click', () => apply(btn.dataset.filter));
    });
    apply('todos');
  }
})();
