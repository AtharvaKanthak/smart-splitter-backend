const roundTo2 = (value) => Math.round(value * 100) / 100;

const buildSettlement = (members, expenses) => {
  const memberMap = new Map();

  members.forEach((member) => {
    const key = member._id?.toString() || member.toString();
    const name = member.name || "Unknown";

    memberMap.set(key, {
      userId: key,
      name,
      paid: 0,
      share: 0,
      balance: 0,
    });
  });

  let totalSpend = 0;

  expenses.forEach((expense) => {
    const amount = Number(expense.amount) || 0;
    const paidBy = expense.paidBy?._id?.toString() || expense.paidBy?.toString();
    const participants = (expense.participants || []).map((p) => p._id?.toString() || p.toString());

    totalSpend += amount;

    if (paidBy && memberMap.has(paidBy)) {
      memberMap.get(paidBy).paid = roundTo2(memberMap.get(paidBy).paid + amount);
    }

    if (participants.length > 0) {
      const splitAmount = amount / participants.length;
      participants.forEach((participantId) => {
        if (memberMap.has(participantId)) {
          memberMap.get(participantId).share = roundTo2(
            memberMap.get(participantId).share + splitAmount
          );
        }
      });
    }
  });

  const balances = Array.from(memberMap.values()).map((person) => {
    const balance = roundTo2(person.paid - person.share);
    return { ...person, balance };
  });

  const creditors = balances
    .filter((person) => person.balance > 0)
    .map((person) => ({ ...person }))
    .sort((a, b) => b.balance - a.balance);

  const debtors = balances
    .filter((person) => person.balance < 0)
    .map((person) => ({ ...person, balance: Math.abs(person.balance) }))
    .sort((a, b) => b.balance - a.balance);

  const transactions = [];
  let i = 0;
  let j = 0;

  // Greedy matching minimizes transaction count in most practical cases.
  while (i < debtors.length && j < creditors.length) {
    const debtor = debtors[i];
    const creditor = creditors[j];
    const amount = roundTo2(Math.min(debtor.balance, creditor.balance));

    if (amount > 0) {
      transactions.push({
        from: debtor.name,
        fromUserId: debtor.userId,
        to: creditor.name,
        toUserId: creditor.userId,
        amount,
        text: `${debtor.name} pays Rs.${amount} to ${creditor.name}`,
      });
    }

    debtor.balance = roundTo2(debtor.balance - amount);
    creditor.balance = roundTo2(creditor.balance - amount);

    if (debtor.balance === 0) i += 1;
    if (creditor.balance === 0) j += 1;
  }

  return {
    totalSpend: roundTo2(totalSpend),
    perPersonShare: members.length ? roundTo2(totalSpend / members.length) : 0,
    balances,
    transactions,
  };
};

module.exports = { buildSettlement };
