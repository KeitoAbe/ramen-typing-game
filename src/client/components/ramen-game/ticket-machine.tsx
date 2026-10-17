import type { Course } from "@/client/lib/ramen-course";

type Props = {
  courses: readonly Course[];
  onSelect: (course: Course) => void;
};

export function TicketMachine({ courses, onSelect }: Props) {
  return (
    <section className="flex flex-col items-center gap-6">
      <p className="text-yatai-kinari/75">
        券売機で食券を買って、カウンターに出てくる注文をローマ字で打とう。
        お会計が食券代を超えれば元が取れる。
      </p>
      <ul className="grid w-full gap-4 sm:grid-cols-3">
        {courses.map((course) => (
          <li key={course.id}>
            <button
              type="button"
              onClick={() => onSelect(course)}
              className="flex w-full flex-col items-center gap-1 rounded-md bg-yatai-lantern px-6 py-4 text-yatai-kinari hover:bg-yatai-lantern-dark"
            >
              <span className="text-2xl font-bold">{course.name}</span>
              <span className="font-semibold">
                {course.price.toLocaleString("ja-JP")} 円
              </span>
              <span className="text-sm">{course.timeLimitMs / 1000} 秒</span>
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}
