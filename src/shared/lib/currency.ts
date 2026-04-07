export const formatMoney = (amount: number, currency: string): string => {
  if (currency === 'RUB') {
    return `${amount} ₽`;
  }

  return `${amount} ${currency}`;
};
