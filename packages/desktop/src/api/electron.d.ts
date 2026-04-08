interface FinanceAppBridge {
  authToken: string;
}

interface Window {
  financeApp?: FinanceAppBridge;
}
