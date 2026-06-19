'use strict';

// Simulador de gateway de pagamento. Não faz nenhuma chamada real.
// Devolve um dos resultados: 'APPROVED', 'DECLINED' ou 'NETWORK_ERROR'.

const MIN_DELAY_MS = 1500;
const MAX_DELAY_MS = 2000;

// Distribuição realista de gateway: 80% aprovação, 15% recusa, 5% erro de rede.
const OUTCOMES = [
  { result: 'APPROVED', weight: 80 },
  { result: 'DECLINED', weight: 15 },
  { result: 'NETWORK_ERROR', weight: 5 },
];

function pickOutcome() {
  const totalWeight = OUTCOMES.reduce((acc, o) => acc + o.weight, 0);
  let roll = Math.random() * totalWeight;
  for (const outcome of OUTCOMES) {
    roll -= outcome.weight;
    if (roll <= 0) return outcome.result;
  }
  return 'APPROVED';
}

function randomDelay() {
  return MIN_DELAY_MS + Math.random() * (MAX_DELAY_MS - MIN_DELAY_MS);
}

function maskedReason(result) {
  switch (result) {
    case 'APPROVED':
      return null;
    case 'DECLINED':
      return 'Cartão recusado pelo emissor.';
    case 'NETWORK_ERROR':
      return 'Falha temporária no gateway. Tente novamente em instantes.';
    default:
      return 'Erro desconhecido no pagamento.';
  }
}

async function authorize({ cardholderName, cardNumber, expiry, cvv } = {}) {
  // Validação mínima de presença (validação fina fica no controller).
  if (!cardholderName || !cardNumber || !expiry || !cvv) {
    return {
      result: 'DECLINED',
      reason: 'Dados do cartão incompletos.',
      authorizedAt: null,
    };
  }

  await new Promise((resolve) => setTimeout(resolve, randomDelay()));

  const result = pickOutcome();
  return {
    result,
    reason: maskedReason(result),
    authorizedAt: result === 'APPROVED' ? new Date() : null,
  };
}

module.exports = {
  authorize,
  MIN_DELAY_MS,
  MAX_DELAY_MS,
};
