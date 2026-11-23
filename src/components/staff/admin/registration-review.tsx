"use client";

import {Check, X} from "lucide-react";
import {useState, useTransition} from "react";

import {adminApproveRegistration, adminRejectRegistration} from "@/app/actions/registration";
import {useActionForm, useErrorMessage} from "@/components/forms/use-action-form";
import {Button} from "@/components/ui/button";
import {Dialog} from "@/components/ui/dialog";
import {FormAlert, TextAreaField} from "@/components/ui/field";
import {useToast} from "@/components/ui/toast";
import {useI18n} from "@/lib/i18n/client";

/** Approve / reject buttons for one pending application (administrators only; enforced server-side). */
export function RegistrationDecision({id, name, people}: {id: string; name: string; people: number}) {
  const {t} = useI18n();
  const toast = useToast();
  const errorMessage = useErrorMessage();
  const [approving, setApproving] = useState(false);
  const [rejecting, setRejecting] = useState(false);
  const [pending, startTransition] = useTransition();
  const reject = useActionForm(adminRejectRegistration, {
    onSuccess: () => {
      setRejecting(false);
      toast("success", t("staff.registrations.rejected"));
    },
  });

  const approve = () =>
    startTransition(async () => {
      const result = await adminApproveRegistration(id);
      setApproving(false);
      if (result.ok) toast("success", t("staff.registrations.approved", {codes: result.data.codes.join(", ")}));
      else toast("error", errorMessage(result));
    });

  return (
    <div className="flex flex-col gap-2 sm:flex-row">
      <Button size="lg" className="h-12 flex-1" onClick={() => setApproving(true)}>
        <Check className="size-5" aria-hidden />
        {t("staff.registrations.approve")}
      </Button>
      <Button size="lg" variant="secondary" className="h-12 flex-1" onClick={() => setRejecting(true)}>
        <X className="size-5" aria-hidden />
        {t("staff.registrations.reject")}
      </Button>

      <Dialog open={approving} onClose={() => !pending && setApproving(false)} title={t("staff.registrations.approve")} size="sm">
        <p className="text-ink-soft">{t("staff.registrations.approveConfirm", {name, count: people})}</p>
        <div className="mt-6 flex justify-end gap-2">
          <Button variant="secondary" onClick={() => setApproving(false)} disabled={pending}>
            {t("common.cancel")}
          </Button>
          <Button onClick={approve} pending={pending}>
            <Check className="size-4" aria-hidden />
            {t("staff.registrations.approve")}
          </Button>
        </div>
      </Dialog>

      <Dialog open={rejecting} onClose={() => !reject.pending && setRejecting(false)} title={t("staff.registrations.rejectTitle")} size="sm">
        <form onSubmit={reject.onSubmit} className="space-y-4" noValidate>
          {reject.error ? <FormAlert>{reject.error}</FormAlert> : null}
          <input type="hidden" name="id" value={id} />
          <TextAreaField label={t("staff.registrations.reason")} name="reason" optional rows={3} error={reject.fieldError("reason")} />
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setRejecting(false)} disabled={reject.pending}>
              {t("common.cancel")}
            </Button>
            <Button type="submit" variant="danger" pending={reject.pending}>
              {t("staff.registrations.reject")}
            </Button>
          </div>
        </form>
      </Dialog>
    </div>
  );
}
