import { beforeEach, describe, expect, it, vi } from "vitest";

const { send } = vi.hoisted(() => ({ send: vi.fn() }));

vi.mock("resend", () => {
  return {
    Resend: class Resend {
      emails = { send };
    },
  };
});

import { sendEmail } from "../../lib/send-email.js";

beforeEach(() => {
  send.mockReset();
  send.mockResolvedValue({ id: "email_test" });
});

describe("sendEmail demo guard", () => {
  it("skips a demo address and does not call Resend", async () => {
    const result = await sendEmail({
      to: "maya@ledgerly-demo.test",
      subject: "Budget alert",
      react: null,
    });

    expect(result).toEqual({ success: true, skipped: true });
    expect(send).not.toHaveBeenCalled();
  });

  it("skips a seeded example.com demo address and does not call Resend", async () => {
    const result = await sendEmail({
      to: "Omar@example.com",
      subject: "Monthly report",
      react: null,
    });

    expect(result).toEqual({ success: true, skipped: true });
    expect(send).not.toHaveBeenCalled();
  });

  it("sends to a normal address", async () => {
    const result = await sendEmail({
      to: "person@example.org",
      subject: "Hello",
      react: null,
    });

    expect(send).toHaveBeenCalledOnce();
    expect(send.mock.calls[0][0]).toMatchObject({
      to: "person@example.org",
      subject: "Hello",
    });
    expect(result.success).toBe(true);
    expect(result.skipped).toBeUndefined();
  });
});
