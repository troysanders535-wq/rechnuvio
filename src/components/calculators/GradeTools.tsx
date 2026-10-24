"use client";

import React, { useState } from "react";
import { BookOpen, GraduationCap, ClipboardCheck } from "lucide-react";
import type { CalculatorVariant } from "@/data/calculatorTools";
import { useTranslations } from "next-intl";
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
  A_GRADE_BOUNDARY,
  GRADE_POINTS_4,
  averageGradePoints,
  finalGradeNeeded,
  gpaOf,
  letterGrade,
  testScore,
  weightedGpaOf,
  type GradeCourse,
} from "./calc";

const GRADE_OPTIONS = Object.keys(GRADE_POINTS_4);

/**
 * The default course list.
 *
 * The course names are labels and are translated by the caller, but the grade
 * codes are lookup keys into GRADE_POINTS_4 and must stay in their original
 * form - a translated grade would no longer resolve to any grade point.
 */
function defaultCourses(labels: {
  mathematics: string;
  physics: string;
  history: string;
  literature: string;
}): GradeCourse[] {
  return [
    { name: labels.mathematics, credits: 4, grade: "A" },
    { name: labels.physics, credits: 4, grade: "B+" },
    { name: labels.history, credits: 3, grade: "A-" },
    { name: labels.literature, credits: 3, grade: "A" },
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
  const tUi = useTranslations("ui.calculators.GradeTools");
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
            aria-label={tUi("courseNameLabel", { index: index + 1 })}
            onChange={(e) => update(index, { name: e.target.value })}
            className="min-w-32 flex-1 rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs text-slate-900 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
          />
          {showCredits ? (
            <input
              type="number"
              min={0}
              step="0.5"
              value={course.credits}
              aria-label={tUi("courseCreditsLabel", { name: course.name })}
              onChange={(e) => update(index, { credits: Number(e.target.value) })}
              className="w-20 rounded-lg border border-slate-300 bg-white px-2 py-2 text-xs text-slate-900 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
            />
          ) : null}
          {showBonus ? (
            <select
              value={String(course.bonus ?? 0)}
              aria-label={tUi("courseWeightingLabel", { name: course.name })}
              onChange={(e) => update(index, { bonus: Number(e.target.value) })}
              className="rounded-lg border border-slate-300 bg-white px-2 py-2 text-xs text-slate-900 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
            >
              <option value="0">{tUi("regular")}</option>
              <option value="0.5">{tUi("honours05")}</option>
              <option value="1">{tUi("aPIB10")}</option>
            </select>
          ) : null}
          <select
            value={course.grade}
            aria-label={tUi("courseGradeLabel", { name: course.name })}
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
            { name: tUi("courseDefaultName", { index: courses.length + 1 }), credits: 3, grade: "B", bonus: 0 },
          ])
        }
        className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
      >
        {tUi("addCourse")}
      </button>
    </div>
  );
}

export function GradeTools({ variant }: { variant: CalculatorVariant }) {
  const tUi = useTranslations("ui.calculators.GradeTools");
  const [courses, setCourses] = useState<GradeCourse[]>(() =>
    defaultCourses({
      mathematics: tUi("mathematics"),
      physics: tUi("physics"),
      history: tUi("history"),
      literature: tUi("literature"),
    }),
  );
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
    { name: tUi("homework"), weight: 20, score: 88 },
    { name: tUi("midterm"), weight: 30, score: 76 },
    { name: tUi("finalExam"), weight: 50, score: 91 },
  ]);

  const gpa = gpaOf(courses);
  const weighted = weightedGpaOf(courses);

  if (variant === "gpa" || variant === "college-gpa") {
    const totalCredits = courses.reduce((sum, c) => sum + (num(c.credits) || 0), 0);
    const current = num(currentGpa);
    const earnedCredits = num(currentCredits);
    const combinedCredits = earnedCredits + totalCredits;
    const cumulative =
      combinedCredits > 0
        ? (current * earnedCredits + gpa * totalCredits) / combinedCredits
        : 0;
    // The GPA the student has to earn next term to finish on a 4.0 average.
    const neededForA40 =
      totalCredits > 0 ? (4 * combinedCredits - current * earnedCredits) / totalCredits : 0;
    return (
      <CalcPanel
        title={variant === "college-gpa" ? tUi("collegeGPACalculator") : tUi("gPACalculator")}
        subtitle={
          variant === "college-gpa"
            ? tUi("collegeGpaCalculatorSubtitle")
            : tUi("gpaCalculatorSubtitle")
        }
        icon={<GraduationCap className="size-5 text-sky-700" />}
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <NumberField label={tUi("currentGPA")} value={currentGpa} onChange={setCurrentGpa} />
          <NumberField label={tUi("creditsEarned")} value={currentCredits} onChange={setCurrentCredits} />
        </div>
        <CourseTable courses={courses} setCourses={setCourses} showCredits showBonus={false} />
        <ResultGrid>
          <ResultCard label={tUi("semesterGPA")} value={round(gpa, 3)} tone="emerald" />
          <ResultCard label={tUi("cumulativeGPA")} value={round(cumulative, 3)} tone="sky" />
          <ResultCard label={tUi("totalCredits")} value={totalCredits} tone="slate" />
          <ResultCard
            label={tUi("qualityPoints")}
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
            label={tUi("gPANeededForA40")}
            value={round(neededForA40, 3)}
            tone={neededForA40 > 4 ? "amber" : "emerald"}
            hint={neededForA40 > 4 ? tUi("notReachableInOneTerm") : undefined}
          />
        </ResultGrid>
        <FormulaNote>
          {tUi("gPAGradePointsCreditHoursCreditHours")}
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
        subtitle={tUi("weightedAndUnweightedGPASideBySideWithHonoursAPAndIBWeighting")}
        icon={<BookOpen className="size-5 text-sky-700" />}
      >
        <CourseTable courses={courses} setCourses={setCourses} showCredits showBonus />
        <ResultGrid>
          <ResultCard label={tUi("unweightedGPA")} value={round(gpa, 3)} tone="emerald" />
          <ResultCard label={tUi("weightedGPA")} value={round(weighted, 3)} tone="sky" />
          <ResultCard
            label={tUi("weightedBonus")}
            value={round(weighted - gpa, 3)}
            tone="slate"
          />
          <ResultCard
            label={tUi("credits")}
            value={courses.reduce((sum, c) => sum + (num(c.credits) || 0), 0)}
            tone="slate"
          />
        </ResultGrid>
        <FormulaNote>{tUi("weightedGPAClassWeightingFormulaNote")}</FormulaNote>
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
        title={tUi("middleSchoolGPACalculator")}
        subtitle={tUi("typeReportCardPercentagesOrLetterGradesNoCreditHoursNeeded")}
        icon={<BookOpen className="size-5 text-sky-700" />}
      >
        <CourseTable courses={courses} setCourses={setCourses} showCredits={false} showBonus={false} />
        <ResultGrid>
          <ResultCard label={tUi("gPA40Scale")} value={round(averageGradePoints(courses), 3)} tone="emerald" />
          <ResultCard label={tUi("averagePercent")} value={round(average, 2)} unit="%" tone="sky" />
          <ResultCard label={tUi("letterGrade")} value={letterGrade(average)} tone="slate" />
          <ResultCard label={tUi("subjects")} value={courses.length} tone="slate" />
        </ResultGrid>
        <FormulaNote>{tUi("middleSchoolGPAScaleFormulaNote")}</FormulaNote>
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
        title={tUi("cumulativeGPACalculator")}
        subtitle={tUi("combineYourCurrentGPAAndCreditsWithNewSemesterGrades")}
        icon={<GraduationCap className="size-5 text-sky-700" />}
      >
        <div className="grid gap-4 sm:grid-cols-3">
          <NumberField label={tUi("currentGPA")} value={currentGpa} onChange={setCurrentGpa} />
          <NumberField label={tUi("creditsEarned")} value={currentCredits} onChange={setCurrentCredits} />
          <NumberField label={tUi("targetGPA")} value={targetGpa} onChange={setTargetGpa} />
        </div>
        <CourseTable courses={courses} setCourses={setCourses} showCredits showBonus={false} />
        <ResultGrid>
          <ResultCard label={tUi("newSemesterGPA")} value={round(semester, 3)} tone="sky" />
          <ResultCard label={tUi("cumulativeGPA")} value={round(cumulative, 3)} tone="emerald" />
          <ResultCard
            label={tUi("gPANeededNextTerm")}
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
            label={tUi("totalCredits")}
            value={credits + termCredits}
            tone="slate"
          />
        </ResultGrid>
        <FormulaNote>{tUi("cumulativeGPAFormulaNote")}</FormulaNote>
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
        title={tUi("raiseGPACalculator")}
        subtitle={tUi("whatYouNeedNextSemesterToReachYourTargetGPA")}
        icon={<GraduationCap className="size-5 text-sky-700" />}
      >
        <div className="grid gap-4 sm:grid-cols-4">
          <NumberField label={tUi("currentGPA")} value={currentGpa} onChange={setCurrentGpa} />
          <NumberField label={tUi("creditsEarned")} value={currentCredits} onChange={setCurrentCredits} />
          <NumberField label={tUi("targetGPA")} value={targetGpa} onChange={setTargetGpa} />
          <NumberField label={tUi("creditsNextTerm")} value={semesterCredits} onChange={setSemesterCredits} />
        </div>
        <ResultGrid>
          <ResultCard
            label={tUi("gPANeededNextTerm")}
            value={round(neededGpa, 3)}
            tone={neededGpa > 4 ? "amber" : "emerald"}
            hint={neededGpa > 4 ? tUi("notReachableInOneTerm") : undefined}
          />
          <ResultCard
            label={tUi("creditsOfAsNeeded")}
            value={creditsNeeded > 0 ? creditsNeeded : 0}
            tone="sky"
            hint={tUi("ifTheRestOfTheTermFallsShort")}
          />
          <ResultCard
            label={tUi("highestReachableGPA")}
            value={round(
              credits + neededSemester > 0
                ? (current * credits + 4 * neededSemester) / (credits + neededSemester)
                : 0,
              3,
            )}
            tone="slate"
          />
          <ResultCard label={tUi("creditsNeeded")} value={creditsNeeded > 0 ? creditsNeeded : 0} tone="slate" />
        </ResultGrid>
        <FormulaNote>{tUi("neededGPAFormulaNote")}</FormulaNote>
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
    // The last category is the final exam: the score it needs for an A.
    const finalWeight = num(weights[weights.length - 1]?.weight);
    const pointsBeforeFinal = weights
      .slice(0, -1)
      .reduce((sum, w) => sum + (num(w.score) || 0) * (num(w.weight) || 0), 0);
    const neededForA =
      finalWeight > 0 && totalWeight > 0
        ? (A_GRADE_BOUNDARY * totalWeight - pointsBeforeFinal) / finalWeight
        : null;
    return (
      <CalcPanel
        title={tUi("gradeCalculator")}
        subtitle={tUi("weightedClassGradeWithCategoriesPlusTheScoreNeededOnTheFinal")}
        icon={<ClipboardCheck className="size-5 text-sky-700" />}
      >
        <div className="space-y-2">
          {weights.map((item, index) => (
            <div key={index} className="flex flex-wrap items-center gap-2">
              <input
                type="text"
                value={item.name}
                aria-label={tUi("categoryLabel", { index: index + 1 })}
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
                aria-label={tUi("itemWeightLabel", { name: item.name })}
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
                aria-label={tUi("itemScoreLabel", { name: item.name })}
                onChange={(e) =>
                  setWeights(
                    weights.map((w, i) => (i === index ? { ...w, score: Number(e.target.value) } : w)),
                  )
                }
                className="w-24 rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
              />
              <span className="text-xs text-slate-500">{tUi("weightAndScore")}</span>
            </div>
          ))}
        </div>
        <ResultGrid>
          <ResultCard label={tUi("classGrade")} value={round(gradeValue, 2)} unit="%" tone="emerald" />
          <ResultCard label={tUi("letterGrade")} value={letterGrade(gradeValue)} tone="sky" />
          <ResultCard
            label={tUi("scoreNeededForAnA")}
            value={neededForA === null ? "—" : round(neededForA, 2)}
            unit={neededForA === null ? undefined : "%"}
            tone={neededForA === null ? "slate" : neededForA > 100 ? "amber" : "emerald"}
            hint={neededForA !== null && neededForA > 100 ? tUi("notReachableWithThisWeight") : undefined}
          />
          <ResultCard label={tUi("totalWeight")} value={round(totalWeight, 2)} unit="%" tone="slate" />
        </ResultGrid>
        <FormulaNote>{tUi("classGradeAndScoreForAnAFormulaNote")}</FormulaNote>
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
        title={tUi("weightedGradeCalculator")}
        subtitle={tUi("weightedGradeFromCategoriesUsePercentWeightsOrPoints")}
        icon={<ClipboardCheck className="size-5 text-sky-700" />}
      >
        <div className="space-y-2">
          {weights.map((item, index) => (
            <div key={index} className="flex flex-wrap items-center gap-2">
              <input
                type="text"
                value={item.name}
                aria-label={tUi("categoryLabel", { index: index + 1 })}
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
                aria-label={tUi("itemWeightLabel", { name: item.name })}
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
                aria-label={tUi("itemScoreLabel", { name: item.name })}
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
          <ResultCard label={tUi("weightedGrade")} value={round(value, 2)} unit="%" tone="emerald" />
          <ResultCard label={tUi("letterGrade")} value={letterGrade(value)} tone="sky" />
          <ResultCard label={tUi("totalWeight")} value={round(totalWeight, 2)} unit="%" tone="slate" />
          <ResultCard
            label={tUi("pointsEarned")}
            value={round(
              weights.reduce((sum, w) => sum + (num(w.score) || 0) * (num(w.weight) || 0), 0) / 100,
              2,
            )}
            tone="slate"
          />
        </ResultGrid>
        <FormulaNote>{tUi("weightedGradeFormulaNote")}</FormulaNote>
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
        title={tUi("finalGradeCalculator")}
        subtitle={tUi("theScoreYouNeedOnTheFinalExamToReachYourGoalGrade")}
        icon={<ClipboardCheck className="size-5 text-sky-700" />}
      >
        <div className="grid gap-4 sm:grid-cols-3">
          <NumberField label={tUi("currentGrade")} value={currentGrade} onChange={setCurrentGrade} />
          <NumberField label={tUi("finalWeight")} value={finalWeight} onChange={setFinalWeight} />
          <NumberField label={tUi("goalGrade")} value={goal} onChange={setGoal} />
        </div>
        <ResultGrid>
          <ResultCard
            label={tUi("scoreNeededOnTheFinal")}
            value={needed === null ? "-" : round(needed, 2)}
            unit={needed === null ? undefined : "%"}
            tone={needed === null ? "slate" : needed > 100 ? "amber" : "emerald"}
            hint={needed !== null && needed > 100 ? tUi("notReachableWithThisWeight") : undefined}
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
                label={tUi("scoreNeededForGrade", { grade: label })}
                value={value === null ? "—" : round(value, 2)}
                unit={value === null ? undefined : "%"}
                tone="slate"
              />
            );
          })}
        </ResultGrid>
        <FormulaNote>{tUi("finalGradeNeededFormulaNote")}</FormulaNote>
      </CalcPanel>
    );
  }

  if (variant === "test-grade") {
    const total = num(questions);
    const right = Math.min(num(correct), total);
    const score = testScore(right, total);
    return (
      <CalcPanel
        title={tUi("testGradeCalculator")}
        subtitle={tUi("yourTestScoreFromTheNumberOfCorrectAnswers")}
        icon={<ClipboardCheck className="size-5 text-sky-700" />}
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <NumberField label={tUi("questionsOnTheTest")} value={questions} onChange={setQuestions} />
          <NumberField label={tUi("correctAnswers")} value={correct} onChange={setCorrect} />
        </div>
        <ResultGrid>
          <ResultCard label={tUi("score")} value={round(score, 2)} unit="%" tone="emerald" />
          <ResultCard label={tUi("letterGrade")} value={letterGrade(score)} tone="sky" />
          <ResultCard label={tUi("wrongAnswers")} value={Math.max(0, total - right)} tone="slate" />
          <ResultCard label={tUi("questions")} value={total} tone="slate" />
        </ResultGrid>
        <FormulaNote>{tUi("testScoreFormulaNote")}</FormulaNote>
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
      title={tUi("easyGrader")}
      subtitle={tUi("aPrintableGradingChartEveryPossibleNumberOfWrongAnswersWithItsPercentageAndLetter")}
      icon={<ClipboardCheck className="size-5 text-sky-700" />}
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <NumberField label={tUi("numberOfQuestions")} value={questions} onChange={setQuestions} />
        <NumberField
          label={tUi("questionsAnsweredCorrectly")}
          value={correct}
          onChange={setCorrect}
        />
      </div>
      <ResultGrid>
        <ResultCard
          label={tUi("currentScore")}
          value={round(testScore(num(correct), totalQuestions), 2)}
          unit="%"
          tone="emerald"
        />
        <ResultCard
          label={tUi("letterGrade")}
          value={letterGrade(testScore(num(correct), totalQuestions))}
          tone="sky"
        />
        <ResultCard label={tUi("questions")} value={totalQuestions} tone="slate" />
        <ResultCard label={tUi("pointsPerQuestion")} value={round(100 / totalQuestions, 2)} unit="%" tone="slate" />
      </ResultGrid>
      <Table headers={[tUi("wrong"), tUi("score2"), tUi("letter")]} rows={chart.map(([w, p, l]) => [w, p, l])} />
      <FormulaNote>{tUi("easyGraderScoreFormulaNote")}</FormulaNote>
    </CalcPanel>
  );
}
