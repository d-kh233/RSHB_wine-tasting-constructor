import { LIMITS } from "@/lib/constants";
import { Field, Input, Textarea } from "../ui/Field";

export interface ProfileValues {
  displayName: string;
  organization: string;
  city: string;
  bio: string;
}

export const EMPTY_PROFILE: ProfileValues = { displayName: "", organization: "", city: "", bio: "" };

/** Публичные данные организатора: гости видят их как «Организатор: …». Общий блок для регистрации и профиля. */
export function ProfileFields({
  values,
  onChange,
  disabled,
}: {
  values: ProfileValues;
  onChange: (next: ProfileValues) => void;
  disabled?: boolean;
}) {
  const set = (key: keyof ProfileValues) => (value: string) => onChange({ ...values, [key]: value });

  return (
    <>
      <Field label="Имя для гостей" hint="Так гости увидят организатора: «Анна Петрова» или «Винный клуб Север».">
        <Input
          value={values.displayName}
          onChange={(e) => set("displayName")(e.target.value)}
          minLength={LIMITS.ORGANIZER_NAME_MIN}
          maxLength={LIMITS.ORGANIZER_NAME_MAX}
          autoComplete="nickname"
          required
          disabled={disabled}
        />
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Организация" hint="Необязательно">
          <Input
            value={values.organization}
            onChange={(e) => set("organization")(e.target.value)}
            maxLength={LIMITS.ORGANIZER_ORG_MAX}
            autoComplete="organization"
            disabled={disabled}
          />
        </Field>
        <Field label="Город" hint="Необязательно">
          <Input
            value={values.city}
            onChange={(e) => set("city")(e.target.value)}
            maxLength={LIMITS.ORGANIZER_CITY_MAX}
            autoComplete="address-level2"
            disabled={disabled}
          />
        </Field>
      </div>
      <Field label="Коротко о себе" hint="Необязательно. Например: «Сомелье, проводим дегустации в Казани».">
        <Textarea
          value={values.bio}
          onChange={(e) => set("bio")(e.target.value)}
          maxLength={LIMITS.ORGANIZER_BIO_MAX}
          rows={2}
          className="min-h-16"
          disabled={disabled}
        />
      </Field>
    </>
  );
}
