import email from "@/infra/email.js";
import orchestrator from "@/tests/orchestrator/orchestrator.mjs";

describe("infra/email.js", () => {
  test("send()", async () => {
    await orchestrator.deleteAllEmails();

    await email.sendMail({
      from: "Test 1 <contact.sender@test.com>",
      to: "<contact.recipient@test.com>",
      subject: "Subject Test",
      text: "Body Test",
    });

    await email.sendMail({
      from: "Test 2 <contact.sender@test.com>",
      to: "<contact.recipient@test.com>",
      subject: "Subject Test of Last Email",
      text: "Body Test Of Last Email",
    });

    const lastEmail = await orchestrator.getLastEmail();

    expect(lastEmail.sender).toBe("<contact.sender@test.com>");
    expect(lastEmail.recipients[0]).toBe("<contact.recipient@test.com>");
    expect(lastEmail.subject).toBe("Subject Test of Last Email");
    expect(lastEmail.text).toBe("Body Test Of Last Email\n");
  });
});
