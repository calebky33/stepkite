import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import type { Cv } from "@/lib/cv/schema";

type Contact = Cv["contact"];
type Key = "fullName" | "email" | "phone" | "city";

const EMAIL_SHAPE = /^\S+@\S+\.\S+$/;

export function ContactEditor({
  contact,
  onChange,
}: {
  contact: Contact;
  onChange: (key: Key, value: string) => void;
}) {
  const emailBad = contact.email !== "" && !EMAIL_SHAPE.test(contact.email);
  return (
    <Card className="flex flex-col gap-4">
      <h2 className="text-lg font-semibold">Contact</h2>
      <Input
        label="Full name"
        autoComplete="name"
        maxLength={120}
        value={contact.fullName}
        onChange={(e) => onChange("fullName", e.target.value)}
      />
      <Input
        label="Email"
        type="email"
        autoComplete="email"
        maxLength={254}
        value={contact.email}
        error={emailBad ? "Enter an email address like name@example.com." : undefined}
        onChange={(e) => onChange("email", e.target.value)}
      />
      <Input
        label="Phone"
        type="tel"
        autoComplete="tel"
        maxLength={32}
        value={contact.phone}
        onChange={(e) => onChange("phone", e.target.value)}
      />
      <Input
        label="City"
        autoComplete="address-level2"
        maxLength={120}
        value={contact.city}
        onChange={(e) => onChange("city", e.target.value)}
      />
    </Card>
  );
}
