// Create mock API object for sandbox
export function createApiMock() {
  return {
    email: {
      list: async ({ limit = 50, assignee }: any = {}) => {
        const emails = Array.from({ length: limit }, (_, i) => ({
          id: i + 1,
          subject: `Email ${i + 1}`,
          from: `sender${i}@example.com`,
          assignee: i % 3 === 0 ? "sarah@company.com" : "john@company.com",
          content: `Email content ${i + 1}`,
        }));
        return assignee
          ? emails.filter((e) => e.assignee === assignee)
          : emails;
      },
      send: async ({ to, subject, body }: any) => {
        console.log(`[Mock] Sending email to ${to}: ${subject}`);
        return { success: true, id: Date.now() };
      },
    },
    github: {
      listPRs: async ({ repo, state = "open" }: any) => {
        return Array.from({ length: 10 }, (_, i) => ({
          number: i + 1,
          title: `PR #${i + 1}`,
          state,
          checks: i % 2 === 0 ? "passing" : "failing",
        }));
      },
      getDiff: async ({ prNumber }: any) => {
        return `Mock diff for PR #${prNumber}`;
      },
      postComment: async ({ prNumber, body }: any) => {
        console.log(`[Mock] Posting comment on PR #${prNumber}`);
        return { success: true };
      },
    },
    slack: {
      postMessage: async ({ channel, text }: any) => {
        console.log(`[Mock] Posting to ${channel}: ${text}`);
        return { success: true, ts: Date.now() };
      },
    },
    crm: {
      getCustomers: async ({ limit = 50 }: any = {}) => {
        return Array.from({ length: limit }, (_, i) => ({
          id: i + 1,
          name: `Customer ${i + 1}`,
          email: `customer${i}@example.com`,
          domain: `company${i}.com`,
        }));
      },
      batchUpdate: async (customers: any[]) => {
        console.log(`[Mock] Batch updating ${customers.length} customers`);
        return { success: true, updated: customers.length };
      },
    },
    clearbit: {
      enrich: async ({ domain }: any) => {
        return {
          companyName: `Company for ${domain}`,
          industry: "Technology",
          employees: Math.floor(Math.random() * 1000),
        };
      },
    },
  };
}
