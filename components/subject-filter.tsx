import { useListSubjects } from "@workspace/api-client-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { SubjectDot } from "@/components/brand";

export function SubjectFilter({ value, onChange, allowAll = true, testId = "select-subject" }: { value: string; onChange: (v: string) => void; allowAll?: boolean; testId?: string }) {
  const { data } = useListSubjects();
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className="w-full rounded-xl bg-card sm:w-[220px]" data-testid={testId} aria-label="Subject">
        <SelectValue placeholder="Choose a subject" />
      </SelectTrigger>
      <SelectContent>
        {allowAll && <SelectItem value="all">All subjects</SelectItem>}
        {data?.map((s) => (
          <SelectItem key={s.id} value={s.id}>
            <span className="flex items-center gap-2"><SubjectDot color={s.color} />{s.name}</span>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
