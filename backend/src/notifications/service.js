// Thirret brenda transaksionit të veprimit që krijon njoftimin.
export function createNotification(transaction, data) {
  return transaction.notification.create({ data });
}
