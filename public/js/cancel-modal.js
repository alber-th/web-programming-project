(function () {
  'use strict';

  const modal = document.getElementById('cancel-modal');
  const form = document.getElementById('cancel-form');
  if (!modal || !form) return;

  const openButtons = document.querySelectorAll('.js-open-cancel');
  const closeTriggers = modal.querySelectorAll('[data-close-modal]');

  function openModal(transactionId) {
    form.action = '/transactions/' + transactionId + '/cancel';
    modal.hidden = false;
    document.body.classList.add('modal-open');
    const reason = document.getElementById('cancel-reason');
    if (reason) {
      reason.value = '';
      setTimeout(() => reason.focus(), 50);
    }
  }

  function closeModal() {
    modal.hidden = true;
    document.body.classList.remove('modal-open');
  }

  openButtons.forEach((btn) => {
    btn.addEventListener('click', () => {
      const id = btn.getAttribute('data-transaction-id');
      if (id) openModal(id);
    });
  });

  closeTriggers.forEach((el) => {
    el.addEventListener('click', closeModal);
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !modal.hidden) closeModal();
  });

  form.addEventListener('submit', () => {
    const submit = form.querySelector('button[type="submit"]');
    if (submit) submit.disabled = true;
  });
})();
