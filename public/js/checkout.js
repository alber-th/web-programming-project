(function () {
  'use strict';

  const form = document.getElementById('checkout-form');
  if (!form) return;

  const cardNumber = form.querySelector('#cardNumber');
  const expiry = form.querySelector('#cardExpiry');
  const cvv = form.querySelector('#cvv');
  const submit = document.getElementById('checkout-submit');

  function maskCardNumber(value) {
    const digits = value.replace(/\D/g, '').slice(0, 19);
    return digits.replace(/(.{4})/g, '$1 ').trim();
  }

  function maskExpiry(value) {
    const digits = value.replace(/\D/g, '').slice(0, 4);
    if (digits.length <= 2) return digits;
    return digits.slice(0, 2) + '/' + digits.slice(2);
  }

  function digitsOnly(value, max) {
    return value.replace(/\D/g, '').slice(0, max);
  }

  if (cardNumber) {
    cardNumber.addEventListener('input', () => {
      const cursor = cardNumber.selectionStart;
      cardNumber.value = maskCardNumber(cardNumber.value);
      // Best-effort cursor restore (não crítico).
      cardNumber.setSelectionRange(cursor, cursor);
    });
  }

  if (expiry) {
    expiry.addEventListener('input', () => {
      expiry.value = maskExpiry(expiry.value);
    });
  }

  if (cvv) {
    cvv.addEventListener('input', () => {
      cvv.value = digitsOnly(cvv.value, 4);
    });
  }

  let isSubmitting = false;
  form.addEventListener('submit', (e) => {
    if (isSubmitting) {
      e.preventDefault();
      return;
    }
    isSubmitting = true;
    if (submit) {
      submit.disabled = true;
      submit.classList.add('is-loading');
      const label = submit.querySelector('.btn-label');
      if (label) label.textContent = 'Processando pagamento…';
    }
  });
})();
