"use client";

import React, { useState } from "react";
import { BookOpen, GraduationCap, ClipboardCheck } from "lucide-react";
import type { CalculatorVariant } from "@/data/calculatorTools";
import {
  CalcPanel,
  DetailList,
  FormulaNote,
  NumberField,
  ResultCard,
  ResultGrid,
  SelectField,
  Table,
  num,
  round,
} from "./shared";
import {
  GRADE_POINTS_4,
  finalGradeNeeded,
  gpaOf,
  letterGrade,
  testScore,
  weightedGpaOf,
  type GradeCourse,
} from "./calc";

const GRADE_OPTIONS = Object.keys(GRADE_POINTS_4);

function defaultCourses(): GradeCourse[] {
  return [
    { name: "Mathematics", credits: 4, grade: "A" },
    { name: "Physics", credits: 4, grade: "B+" },
    { name: "History", credits: 3, grade: "A-" },
    { name: "Literature", credits: 3, grade: "A" },
  ];
}

function CourseTable({
  courses,
  setCourses,
  showCredits,
  showBonus,
}: {
  courses: GradeCourse[];
  setCourses: (courses: GradeCourse[]) => void;
  showCredits: boolean;
  showBonus: boolean;
}) {
  const update = (index: number, patch: Partial<GradeCourse>) => {
    const copy = courses.map((course, i) => (i === index ? { ...course, ...patch } : course));
    setCourses(copy);
  };

  return (
    <div className="space-y-2">
      {courses.map((course, index) => (
        <div key={index} className="flex flex-wrap items-center gap-2">
          <input
            type="text"
            value={course.name}
            aria-label={`Course ${index + 1} name`}
            onChange={(e) => update(index, { name: e.target.value })}
            className="min-w-32 flex-1 rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs text-slate-900 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
          />
          {showCredits ? (
            <input
              type="number"
              min={0}
              step="0.5"
              value={course.credits}
              aria-label={`${course.name} credits`}
              onChange={(e) => update(index, { credits: Number(e.target.value) })}
              className="w-20 rounded-lg border border-slate-300 bg-white px-2 py-2 text-xs text-slate-900 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
            />
          ) : null}
          {showBonus ? (
            <select
              value={String(course.bonus ?? 0)}
              aria-label={`${course.name} weighting`}
              onChange={(e) => update(index, { bonus: Number(e.target.value) })}
              className="rounded-lg border border-slate-300 bg-white px-2 py-2 text-xs text-slate-900 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
            >
              <option value="0">Regular</option>
              <option value="0.5">Honours +0.5</option>
              <option value="1">AP / IB +1.0</option>
            </select>
          ) : null}
          <select
            value={course.grade}
            aria-label={`${course.name} grade`}
            onChange={(e) => update(index, { grade: e.target.value })}
            className="rounded-lg border border-slate-300 bg-white px-2 py-2 text-xs text-slate-900 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
          >
            {GRADE_OPTIONS.map((grade) => (
              <option key={grade} value={grade}>
                {grade} ({GRADE_POINTS_4[grade]})
              </option>
            ))}
          </select>
        </div>
      ))}
      <button
        type="button"
        onClick={() =>
          setCourses([
            ...courses,
            { name: `Course ${courses.length + 1}`, credits: 3, grade: "B", bonus: 0 },
          ])
        }
        className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
      >
        + Add course
      </button>
    </div>
  );
}

export function GradeTools({ variant }: { variant: CalculatorVariant }) {
  const [courses, setCourses] = useState<GradeCourse[]>(defaultCourses);
  const [currentGpa, setCurrentGpa] = useState("3.2");
  const [currentCredits, setCurrentCredits] = useState("45");
  const [targetGpa, setTargetGpa] = useState("3.8");
  const [semesterCredits, setSemesterCredits] = useState("15");
  const [currentGrade, setCurrentGrade] = useState("82");
  const [finalWeight, setFinalWeight] = useState("30");
  const [goal, setGoal] = useState("90");
  const [questions, setQuestions] = useState("20");
  const [correct, setCorrect] = useState("18");
  const [weights, setWeights] = useState([
    { name: "Homework", weight: 20, score: 88 },
    { name: "Midterm", weight: 30, score: 76 },
    { name: "Final exam", weight: 50, score: 91 },
  ]);

  const gpa = gpaOf(courses);
  const weighted = weightedGpaOf(courses);

  if (variant === "gpa" || variant === "college-gpa") {
    const totalCredits = courses.reduce((sum, c) => sum + (num(c.credits) || 0), 0);
    return (
      <CalcPanel
        title={variant === "college-gpa" ? "College GPA Calculator" : "GPA Calculator"}
        subtitle={
          variant === "college-gpa"
            ? "Semester GPA and cumulative GPA on the 4.0 scale, plus the GPA needed next term."
            : "Add classes, credits and grades to get your GPA on the 4.0 scale."
        }
        icon={<GraduationCap className="size-5 text-sky-700" />}
      >
        <CourseTable courses={courses} setCourses={setCourses} showCredits showBonus={false} />
        <ResultGrid>
          <ResultCard label="Semester GPA" value={round(gpa, 3)} tone="emerald" />
          <ResultCard label="Total credits" value={totalCredits} tone="slate" />
          <ResultCard
            label="Quality points"
            value={round(
              courses.reduce(
                (sum, c) => sum + (GRADE_POINTS_4[c.grade] ?? 0) * (num(c.credits) || 0),
                0,
              ),
              2,
            )}
            tone="slate"
          />
          <ResultCard
            label="GPA needed for a 4.0"
            value={round((totalCredits * 4 - (totalCredits * gpa - 0)) / totalCredits || 0, 3)}
            tone="sky"
            hint="credits × 4.0 per course"
          />
        </ResultGrid>
        <FormulaNote>
          GPA = Σ (grade points × credit hours) ÷ Σ credit hours
        </FormulaNote>
      </CalcPanel>
    );
  }

  if (variant === "high-school-gpa" || variant === "weighted-gpa") {
    return (
      <CalcPanel
        title={
          variant === "high-school-gpa"
            ? "High School GPA Calculator"
            : "Weighted GPA Calculator"
        }
        subtitle="Weighted and unweighted GPA side by side, with Honours, AP and IB weighting."
        icon={<BookOpen className="size-5 text-sky-700" />}
      >
        <CourseTable courses={courses} setCourses={setCourses} showCredits showBonus />
        <ResultGrid>
          <ResultCard label="Unweighted GPA" value={round(gpa, 3)} tone="emerald" />
          <ResultCard label="Weighted GPA" value={round(weighted, 3)} tone="sky" />
          <ResultCard
            label="Weighted bonus"
            value={round(weighted - gpa, 3)}
            tone="slate"
          />
          <ResultCard
            label="Credits"
            value={courses.reduce((sum, c) => sum + (num(c.credits) || 0), 0)}
            tone="slate"
          />
        </ResultGrid>
        <FormulaNote>
          Weighted GPA adds the class weighting (Honours +0.5, AP/IB +1.0) to the grade points
          before multiplying by credit hours.
        </FormulaNote>
      </CalcPanel>
    );
  }

  if (variant === "middle-school-gpa") {
    const percentages = courses.map((c) => {
      const points = GRADE_POINTS_4[c.grade] ?? 0;
      const map: Record<string, number> = {
        "4.0": 97, "3.7": 93, "3.3": 89, "3.0": 85, "2.7": 81,
        "2.3": 77, "2.0": 73, "1.7": 69, "1.3": 64, "1.0": 60, "0.7": 55, "0.0": 50,
      };
      return map[points.toFixed(1)] ?? 70;
    });
    const average = percentages.length
      ? percentages.reduce((sum, p) => sum + p, 0) / percentages.length
      : 0;
    return (
      <CalcPanel
        title="Middle School GPA Calculator"
        subtitle="Type report card percentages or letter grades — no credit hours needed."
        icon={<BookOpen className="size-5 text-sky-700" />}
      >
        <CourseTable courses={courses} setCourses={setCourses} showCredits={false} showBonus={false} />
        <ResultGrid>
          <ResultCard label="GPA (4.0 scale)" value={round(gpa, 3)} tone="emerald" />
          <ResultCard label="Average percent" value={round(average, 2)} unit="%" tone="sky" />
          <ResultCard label="Letter grade" value={letterGrade(average)} tone="slate" />
          <ResultCard label="Subjects" value={courses.length} tone="slate" />
        </ResultGrid>
        <FormulaNote>
          Middle school GPA uses the same 4.0 scale, weighted by the grade only — credit hours are
          not part of the calculation.
        </FormulaNote>
      </CalcPanel>
    );
  }

  if (variant === "cumulative-gpa") {
    const current = num(currentGpa);
    const credits = num(currentCredits);
    const semester = gpaOf(courses);
    const termCredits =
      courses.reduce((sum, c) => sum + (num(c.credits) || 0), 0) || num(semesterCredits);
    const cumulative =
      credits + termCredits > 0
        ? (current * credits + semester * termCredits) / (credits + termCredits)
        : 0;
    return (
      <CalcPanel
        title="Cumulative GPA Calculator"
        subtitle="Combine your current GPA and credits with new semester grades."
        icon={<GraduationCap className="size-5 text-sky-700" />}
      >
        <div className="grid gap-4 sm:grid-cols-3">
          <NumberField label="Current GPA" value={currentGpa} onChange={setCurrentGpa} />
          <NumberField label="Credits earned" value={currentCredits} onChange={setCurrentCredits} />
          <NumberField label="Target GPA" value={targetGpa} onChange={setTargetGpa} />
        </div>
        <CourseTable courses={courses} setCourses={setCourses} showCredits showBonus={false} />
        <ResultGrid>
          <ResultCard label="New semester GPA" value={round(semester, 3)} tone="sky" />
          <ResultCard label="Cumulative GPA" value={round(cumulative, 3)} tone="emerald" />
          <ResultCard
            label="GPA needed next term"
            value={
              credits + termCredits > 0
                ? round(
                    (num(targetGpa) * (credits + termCredits) - current * credits) /
                      termCredits,
                    3,
                  )
                : 0
            }
            tone="amber"
          />
          <ResultCard
            label="Total credits"
            value={credits + termCredits}
            tone="slate"
          />
        </ResultGrid>
        <FormulaNote>
          cumulative GPA = (current GPA × credits + semester GPA × semester credits) ÷ total
          credits
        </FormulaNote>
      </CalcPanel>
    );
  }

  if (variant === "raise-gpa") {
    const current = num(currentGpa);
    const credits = num(currentCredits);
    const target = num(targetGpa);
    const neededSemester = num(semesterCredits);
    const neededGpa =
      credits + neededSemester > 0
        ? (target * (credits + neededSemester) - current * credits) / neededSemester
        : 0;
    // How many credits of straight A's are needed if the rest falls short.
    const creditsNeeded = current < target && neededSemester > 0
      ? Math.ceil((target * (credits + neededSemester) - current * credits) / 4)
      : 0;
    return (
      <CalcPanel
        title="Raise GPA Calculator"
        subtitle="What you need next semester to reach your target GPA."
        icon={<GraduationCap className="size-5 text-sky-700" />}
      >
        <div className="grid gap-4 sm:grid-cols-4">
          <NumberField label="Current GPA" value={currentGpa} onChange={setCurrentGpa} />
          <NumberField label="Credits earned" value={currentCredits} onChange={setCurrentCredits} />
          <NumberField label="Target GPA" value={targetGpa} onChange={setTargetGpa} />
          <NumberField label="Credits next term" value={semesterCredits} onChange={setSemesterCredits} />
        </div>
        <ResultGrid>
          <ResultCard
            label="GPA needed next term"
            value={round(neededGpa, 3)}
            tone={neededGpa > 4 ? "amber" : "emerald"}
            hint={neededGpa > 4 ? "Not reachable in one term" : undefined}
          />
          <ResultCard
            label="Credits of A's needed"
            value={creditsNeeded > 0 ? creditsNeeded : 0}
            tone="sky"
            hint="if the rest of the term falls short"
          />
          <ResultCard
            label="Highest reachable GPA"
            value={round(
              credits + neededSemester > 0
                ? (current * credits + 4 * neededSemester) / (credits + neededSemester)
                : 0,
              3,
            )}
            tone="slate"
          />
          <ResultCard label="Credits needed" value={creditsNeeded > 0 ? creditsNeeded : 0} tone="slate" />
        </ResultGrid>
        <FormulaNote>
          needed GPA = (target × (earned + new credits) − current × earned) ÷ new credits
        </FormulaNote>
      </CalcPanel>
    );
  }

  if (variant === "grade") {
    const totalWeight = weights.reduce((sum, w) => sum + (num(w.weight) || 0), 0);
    const gradeValue =
      totalWeight > 0
        ? weights.reduce(
            (sum, w) => sum + (num(w.score) || 0) * (num(w.weight) || 0),
            0,
          ) / totalWeight
        : 0;
    return (
      <CalcPanel
        title="Grade Calculator"
        subtitle="Weighted class grade with categories, plus the score needed on the final."
        icon={<ClipboardCheck className="size-5 text-sky-700" />}
      >
        <div className="space-y-2">
          {weights.map((item, index) => (
            <div key={index} className="flex flex-wrap items-center gap-2">
              <input
                type="text"
                value={item.name}
                aria-label={`Category ${index + 1}`}
                onChange={(e) =>
                  setWeights(
                    weights.map((w, i) => (i === index ? { ...w, name: e.target.value } : w)),
                  )
                }
                className="min-w-32 flex-1 rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
              />
              <input
                type="number"
                value={item.weight}
                aria-label={`${item.name} weight`}
                onChange={(e) =>
                  setWeights(
                    weights.map((w, i) => (i === index ? { ...w, weight: Number(e.target.value) } : w)),
                  )
                }
                className="w-24 rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
              />
              <input
                type="number"
                value={item.score}
                aria-label={`${item.name} score`}
                onChange={(e) =>
                  setWeights(
                    weights.map((w, i) => (i === index ? { ...w, score: Number(e.target.value) } : w)),
                  )
                }
                className="w-24 rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
              />
              <span className="text-xs text-slate-500">% weight / % score</span>
            </div>
          ))}
        </div>
        <ResultGrid>
          <ResultCard label="Class grade" value={round(gradeValue, 2)} unit="%" tone="emerald" />
          <ResultCard label="Letter grade" value={letterGrade(gradeValue)} tone="sky" />
          <ResultCard
            label="Score needed for an A"
            value={
              finalGradeNeeded(gradeValue, 100, 90) === null
                ? "—"
                : round(finalGradeNeeded(gradeValue, 100, 90) as number, 2)
            }
            tone="slate"
          />
          <ResultCard label="Total weight" value={round(totalWeight, 2)} unit="%" tone="slate" />
        </ResultGrid>
        <FormulaNote>
          class grade = Σ (category score × category weight) ÷ Σ weights · the weights do not have
          to add up to 100.
        </FormulaNote>
      </CalcPanel>
    );
  }

  if (variant === "weighted-grade") {
    const totalWeight = weights.reduce((sum, w) => sum + (num(w.weight) || 0), 0);
    const value =
      totalWeight > 0
        ? weights.reduce(
            (sum, w) => sum + (num(w.score) || 0) * (num(w.weight) || 0),
            0,
          ) / totalWeight
        : 0;
    return (
      <CalcPanel
        title="Weighted Grade Calculator"
        subtitle="Weighted grade from categories — use percent weights or points."
        icon={<ClipboardCheck className="size-5 text-sky-700" />}
      >
        <div className="space-y-2">
          {weights.map((item, index) => (
            <div key={index} className="flex flex-wrap items-center gap-2">
              <input
                type="text"
                value={item.name}
                aria-label={`Category ${index + 1}`}
                onChange={(e) =>
                  setWeights(
                    weights.map((w, i) => (i === index ? { ...w, name: e.target.value } : w)),
                  )
                }
                className="min-w-32 flex-1 rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
              />
              <input
                type="number"
                value={item.weight}
                aria-label={`${item.name} weight`}
                onChange={(e) =>
                  setWeights(
                    weights.map((w, i) => (i === index ? { ...w, weight: Number(e.target.value) } : w)),
                  )
                }
                className="w-24 rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
              />
              <input
                type="number"
                value={item.score}
                aria-label={`${item.name} score`}
                onChange={(e) =>
                  setWeights(
                    weights.map((w, i) => (i === index ? { ...w, score: Number(e.target.value) } : w)),
                  )
                }
                className="w-24 rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
              />
            </div>
          ))}
        </div>
        <ResultGrid>
          <ResultCard label="Weighted grade" value={round(value, 2)} unit="%" tone="emerald" />
          <ResultCard label="Letter grade" value={letterGrade(value)} tone="sky" />
          <ResultCard label="Total weight" value={round(totalWeight, 2)} unit="%" tone="slate" />
          <ResultCard
            label="Points earned"
            value={round(
              weights.reduce((sum, w) => sum + (num(w.score) || 0) * (num(w.weight) || 0), 0) / 100,
              2,
            )}
            tone="slate"
          />
        </ResultGrid>
        <FormulaNote>
          weighted grade = Σ (score × weight) ÷ Σ weights
        </FormulaNote>
      </CalcPanel>
    );
  }

  if (variant === "final-grade") {
    const needed = finalGradeNeeded(
      num(currentGrade),
      num(finalWeight),
      num(goal),
    );
    const goals: [string, number][] = [
      ["A", 90],
      ["B", 80],
      ["C", 70],
    ];
    return (
      <CalcPanel
        title="Final Grade Calculator"
        subtitle="The score you need on the final exam to reach your goal grade."
        icon={<ClipboardCheck className="size-5 text-sky-700" />}
      >
        <div className="grid gap-4 sm:grid-cols-3">
          <NumberField label="Current grade (%)" value={currentGrade} onChange={setCurrentGrade} />
          <NumberField label="Final weight (%)" value={finalWeight} onChange={setFinalWeight} />
          <NumberField label="Goal grade (%)" value={goal} onChange={setGoal} />
        </div>
        <ResultGrid>
          <ResultCard
            label={`Score needed on the final`}
            value={needed === null ? "—" : round(needed, 2)}
            unit={needed === null ? undefined : "%"}
            tone={needed === null ? "slate" : needed > 100 ? "amber" : "emerald"}
            hint={needed !== null && needed > 100 ? "Not reachable with this weight" : undefined}
          />
          {goals.map(([label, target]) => {
            const value = finalGradeNeeded(
              num(currentGrade),
              num(finalWeight),
              target,
            );
            return (
              <ResultCard
                key={label}
                label={`For a ${label}`}
                value={value === null ? "—" : round(value, 2)}
                unit={value === null ? undefined : "%"}
                tone="slate"
              />
            );
          })}
        </ResultGrid>
        <FormulaNote>
          needed = (target − current × (1 − weight)) ÷ weight
        </FormulaNote>
      </CalcPanel>
    );
  }

  if (variant === "test-grade") {
    const total = num(questions);
    const right = Math.min(num(correct), total);
    const score = testScore(right, total);
    return (
      <CalcPanel
        title="Test Grade Calculator"
        subtitle="Your test score from the number of correct answers."
        icon={<ClipboardCheck className="size-5 text-sky-700" />}
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <NumberField label="Questions on the test" value={questions} onChange={setQuestions} />
          <NumberField label="Correct answers" value={correct} onChange={setCorrect} />
        </div>
        <ResultGrid>
          <ResultCard label="Score" value={round(score, 2)} unit="%" tone="emerald" />
          <ResultCard label="Letter grade" value={letterGrade(score)} tone="sky" />
          <ResultCard label="Wrong answers" value={Math.max(0, total - right)} tone="slate" />
          <ResultCard label="Questions" value={total} tone="slate" />
        </ResultGrid>
        <FormulaNote>
          score = correct answers ÷ total questions × 100
        </FormulaNote>
      </CalcPanel>
    );
  }

  // easy-grader
  const totalQuestions = Math.max(1, Math.round(num(questions)));
  const chart = Array.from({ length: totalQuestions + 1 }, (_, wrong) => {
    const percent = ((totalQuestions - wrong) / totalQuestions) * 100;
    return [wrong, round(percent, 1), letterGrade(percent)] as [number, number, string];
  });
  return (
    <CalcPanel
      title="Easy Grader"
      subtitle="A printable grading chart — every possible number of wrong answers with its percentage and letter."
      icon={<ClipboardCheck className="size-5 text-sky-700" />}
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <NumberField label="Number of questions" value={questions} onChange={setQuestions} />
        <NumberField
          label="Questions answered correctly"
          value={correct}
          onChange={setCorrect}
        />
      </div>
      <ResultGrid>
        <ResultCard
          label="Current score"
          value={round(testScore(num(correct), totalQuestions), 2)}
          unit="%"
          tone="emerald"
        />
        <ResultCard
          label="Letter grade"
          value={letterGrade(testScore(num(correct), totalQuestions))}
          tone="sky"
        />
        <ResultCard label="Questions" value={totalQuestions} tone="slate" />
        <ResultCard label="Points per question" value={round(100 / totalQuestions, 2)} unit="%" tone="slate" />
      </ResultGrid>
      <Table headers={["Wrong", "Score %", "Letter"]} rows={chart.map(([w, p, l]) => [w, p, l])} />
      <FormulaNote>
        score = (questions − wrong) ÷ questions × 100
      </FormulaNote>
    </CalcPanel>
  );
}
