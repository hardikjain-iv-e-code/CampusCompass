/*
============================================================
CAMPUSCOMPASS — SHARED DATA + SYNC ENGINE
============================================================

Used by:
- index.html
- onboarding.html
- planner.html
- dashboard.html
- progress.html

Responsibilities:
- Student profile storage
- Planner storage
- Task completion storage
- Cross-page synchronization
- Cross-tab synchronization
- Progress calculation
- Skill calculation
- AI context
- AI response engine
- Legacy data migration
============================================================
*/


/* =========================================================
   STORAGE KEYS
========================================================= */

const CAMPUS_KEYS = {

  student:
    "campusCompassStudent",

  plan:
    "campusCompassPlan",

  tasks:
    "campusCompassPlannerTasks",

  legacyTasks:
    "campusCompassTasks",

  version:
    "campusCompassDataVersion"

};


const CAMPUS_DATA_VERSION = 2;


/* =========================================================
   STORAGE HELPERS
========================================================= */

function ccGet(
  key,
  fallback = null
) {

  try {

    const value =
      localStorage.getItem(key);

    if (
      value === null ||
      value === ""
    ) {

      return fallback;

    }

    return JSON.parse(value);

  } catch (error) {

    console.warn(
      "CampusCompass storage read error:",
      error
    );

    return fallback;

  }

}


function ccSet(
  key,
  value,
  notify = true
) {

  try {

    localStorage.setItem(
      key,
      JSON.stringify(value)
    );

    if (notify) {

      ccNotifyChange();

    }

    return true;

  } catch (error) {

    console.warn(
      "CampusCompass storage save error:",
      error
    );

    return false;

  }

}


function ccRemove(
  key
) {

  try {

    localStorage.removeItem(
      key
    );

    ccNotifyChange();

    return true;

  } catch (error) {

    console.warn(
      "CampusCompass storage remove error:",
      error
    );

    return false;

  }

}


/* =========================================================
   INITIALIZATION / MIGRATION
========================================================= */

function ccInitialize() {

  try {

    const currentVersion =
      Number(
        localStorage.getItem(
          CAMPUS_KEYS.version
        )
      ) || 0;


    /*
     * Migrate legacy task storage
     * if the new task storage doesn't exist.
     */

    const newTasks =
      localStorage.getItem(
        CAMPUS_KEYS.tasks
      );

    const legacyTasks =
      localStorage.getItem(
        CAMPUS_KEYS.legacyTasks
      );


    if (
      !newTasks &&
      legacyTasks
    ) {

      try {

        const parsedLegacy =
          JSON.parse(
            legacyTasks
          );


        if (
          parsedLegacy &&
          typeof parsedLegacy === "object"
        ) {

          localStorage.setItem(
            CAMPUS_KEYS.tasks,
            JSON.stringify(
              parsedLegacy
            )
          );

        }

      } catch(error) {

        console.warn(
          "CampusCompass legacy task migration failed:",
          error
        );

      }

    }


    /*
     * Make sure the main task state exists.
     */

    if (
      !localStorage.getItem(
        CAMPUS_KEYS.tasks
      )
    ) {

      localStorage.setItem(
        CAMPUS_KEYS.tasks,
        JSON.stringify({})
      );

    }


    /*
     * Make sure the plan exists.
     */

    if (
      !localStorage.getItem(
        CAMPUS_KEYS.plan
      )
    ) {

      localStorage.setItem(
        CAMPUS_KEYS.plan,
        JSON.stringify([])
      );

    }


    /*
     * Record current data version.
     */

    if (
      currentVersion !==
      CAMPUS_DATA_VERSION
    ) {

      localStorage.setItem(
        CAMPUS_KEYS.version,
        String(
          CAMPUS_DATA_VERSION
        )
      );

    }

  } catch(error) {

    console.warn(
      "CampusCompass initialization error:",
      error
    );

  }

}


/* =========================================================
   STUDENT
========================================================= */

function ccGetStudent() {

  const student =
    ccGet(
      CAMPUS_KEYS.student,
      null
    );


  if (
    !student ||
    typeof student !== "object"
  ) {

    return null;

  }


  return student;

}


function ccSaveStudent(
  student
) {

  if (
    !student ||
    typeof student !== "object"
  ) {

    return false;

  }


  const existing =
    ccGetStudent() || {};


  const merged = {

    ...existing,

    ...student

  };


  return ccSet(
    CAMPUS_KEYS.student,
    merged
  );

}


/* =========================================================
   UPDATE STUDENT FIELD
========================================================= */

function ccUpdateStudentField(
  key,
  value
) {

  const student =
    ccGetStudent() || {};


  student[key] =
    value;


  return ccSaveStudent(
    student
  );

}


/* =========================================================
   PLAN
========================================================= */

function ccGetPlan() {

  const plan =
    ccGet(
      CAMPUS_KEYS.plan,
      []
    );


  return Array.isArray(plan)
    ? plan
    : [];

}


function ccSavePlan(
  plan
) {

  const safePlan =
    Array.isArray(plan)
      ? plan
      : [];


  return ccSet(
    CAMPUS_KEYS.plan,
    safePlan
  );

}


/* =========================================================
   TASK STATE
========================================================= */

function ccGetTaskState() {

  const state =
    ccGet(
      CAMPUS_KEYS.tasks,
      {}
    );


  if (
    !state ||
    typeof state !== "object" ||
    Array.isArray(state)
  ) {

    return {};

  }


  return state;

}


function ccSaveTaskState(
  state
) {

  if (
    !state ||
    typeof state !== "object"
  ) {

    state = {};

  }


  return ccSet(
    CAMPUS_KEYS.tasks,
    state
  );

}


/* =========================================================
   TASK ID NORMALIZATION
========================================================= */

function ccTaskId(
  task
) {

  if (
    task === null ||
    task === undefined
  ) {

    return "";

  }


  if (
    typeof task === "object"
  ) {

    return String(
      task.id ?? ""
    );

  }


  return String(
    task
  );

}


/* =========================================================
   ALL TASKS
========================================================= */

function ccGetAllTasks() {

  const plan =
    ccGetPlan();


  const tasks = [];


  plan.forEach(
    day => {

      if (
        !day ||
        !Array.isArray(
          day.tasks
        )
      ) {

        return;

      }


      day.tasks.forEach(
        task => {

          if (!task) {
            return;
          }


          const id =
            ccTaskId(task);


          /*
           * Tasks without IDs cannot
           * reliably synchronize.
           */

          if (!id) {
            return;
          }


          tasks.push({

            ...task,

            id

          });

        }
      );

    }
  );


  return tasks;

}


/* =========================================================
   FIND TASK
========================================================= */

function ccFindTask(
  taskId
) {

  const wanted =
    String(
      taskId
    );


  return ccGetAllTasks()
    .find(
      task =>
        String(
          task.id
        ) === wanted
    ) || null;

}


/* =========================================================
   COMPLETED TASKS
========================================================= */

function ccGetCompletedTasks() {

  const state =
    ccGetTaskState();


  return ccGetAllTasks()
    .filter(
      task =>
        Boolean(
          state[
            String(task.id)
          ]
        )
    );

}


/* =========================================================
   INCOMPLETE TASKS
========================================================= */

function ccGetIncompleteTasks() {

  const state =
    ccGetTaskState();


  return ccGetAllTasks()
    .filter(
      task =>
        !Boolean(
          state[
            String(task.id)
          ]
        )
    );

}


/* =========================================================
   TASK COMPLETION
========================================================= */

function ccIsTaskComplete(
  taskId
) {

  const state =
    ccGetTaskState();


  return Boolean(
    state[
      String(taskId)
    ]
  );

}


/* =========================================================
   TASK TOGGLE
========================================================= */

function ccToggleTask(
  taskId
) {

  const id =
    String(
      taskId
    );


  const task =
    ccFindTask(id);


  if (!task) {

    console.warn(
      "CampusCompass: task not found:",
      id
    );

    return false;

  }


  const state =
    ccGetTaskState();


  state[id] =
    !Boolean(
      state[id]
    );


  ccSaveTaskState(
    state
  );


  return Boolean(
    state[id]
  );

}


/* =========================================================
   SET TASK COMPLETION
========================================================= */

function ccSetTaskCompleted(
  taskId,
  completed = true
) {

  const id =
    String(
      taskId
    );


  const task =
    ccFindTask(id);


  if (!task) {

    return false;

  }


  const state =
    ccGetTaskState();


  state[id] =
    Boolean(
      completed
    );


  ccSaveTaskState(
    state
  );


  return state[id];

}


/* =========================================================
   RESET ALL TASKS
========================================================= */

function ccResetTasks() {

  ccSaveTaskState(
    {}
  );


  return true;

}


/* =========================================================
   PROGRESS
========================================================= */

function ccGetProgress() {

  const tasks =
    ccGetAllTasks();


  if (!tasks.length) {

    return 0;

  }


  const completed =
    ccGetCompletedTasks();


  return Math.round(
    (
      completed.length /
      tasks.length
    ) *
    100
  );

}


/* =========================================================
   COMPLETED MINUTES
========================================================= */

function ccGetCompletedMinutes() {

  return ccGetCompletedTasks()
    .reduce(
      (
        total,
        task
      ) => {

        return (
          total +
          Number(
            task.duration || 0
          )
        );

      },
      0
    );

}


/* =========================================================
   TOTAL PLANNED MINUTES
========================================================= */

function ccGetTotalPlannedMinutes() {

  return ccGetAllTasks()
    .reduce(
      (
        total,
        task
      ) => {

        return (
          total +
          Number(
            task.duration || 0
          )
        );

      },
      0
    );

}


/* =========================================================
   REMAINING MINUTES
========================================================= */

function ccGetRemainingMinutes() {

  return Math.max(
    0,
    ccGetTotalPlannedMinutes() -
    ccGetCompletedMinutes()
  );

}


/* =========================================================
   COMPLETED PROJECTS
========================================================= */

function ccGetCompletedProjects() {

  return ccGetCompletedTasks()
    .filter(
      task => {

        const category =
          String(
            task.category || ""
          )
          .toLowerCase()
          .trim()
          .replace(
            /s$/,
            ""
          );


        return (
          category ===
          "project"
        );

      }
    )
    .length;

}


/* =========================================================
   TOTAL PROJECTS
========================================================= */

function ccGetTotalProjects() {

  return ccGetAllTasks()
    .filter(
      task => {

        const category =
          String(
            task.category || ""
          )
          .toLowerCase()
          .trim()
          .replace(
            /s$/,
            ""
          );


        return (
          category ===
          "project"
        );

      }
    )
    .length;

}


/* =========================================================
   DAY PROGRESS
========================================================= */

function ccGetDayProgress(
  day
) {

  const tasks =
    day &&
    Array.isArray(
      day.tasks
    )
      ? day.tasks
      : [];


  const state =
    ccGetTaskState();


  const completed =
    tasks.filter(
      task =>
        Boolean(
          state[
            String(
              task.id
            )
          ]
        )
    ).length;


  return {

    completed,

    total:
      tasks.length,

    percent:
      tasks.length
        ? Math.round(
            completed /
            tasks.length *
            100
          )
        : 0

  };

}


/* =========================================================
   GET CURRENT / FIRST DAY
========================================================= */

function ccGetTodayPlan() {

  const plan =
    ccGetPlan();


  return plan.length
    ? plan[0]
    : null;

}


/* =========================================================
   DAY COMPLETION
========================================================= */

function ccIsDayComplete(
  day
) {

  const progress =
    ccGetDayProgress(
      day
    );


  return (
    progress.total > 0 &&
    progress.completed ===
      progress.total
  );

}


/* =========================================================
   CATEGORY HELPERS
========================================================= */

function ccNormalizeCategory(
  value
) {

  return String(
    value || ""
  )
  .toLowerCase()
  .trim()
  .replace(
    /s$/,
    ""
  );

}


function ccGetTasksByCategory(
  category
) {

  const wanted =
    ccNormalizeCategory(
      category
    );


  return ccGetAllTasks()
    .filter(
      task =>
        ccNormalizeCategory(
          task.category
        ) === wanted
    );

}


/* =========================================================
   SKILL PROGRESS
========================================================= */

function ccGetSkillProgress() {

  const all =
    ccGetAllTasks();


  const completed =
    ccGetCompletedTasks();


  const overall =
    ccGetProgress();


  /*
   * Technical tasks
   */

  const technicalTasks =
    all.filter(
      task => {

        const category =
          ccNormalizeCategory(
            task.category
          );


        return (
          category === "technical" ||
          category === "technicalskill" ||
          category === "skill"
        );

      }
    );


  const technicalCompleted =
    technicalTasks.filter(
      task =>
        ccIsTaskComplete(
          task.id
        )
    );


  let technical;


  if (
    technicalTasks.length
  ) {

    technical =
      Math.round(
        technicalCompleted.length /
        technicalTasks.length *
        100
      );

  } else {

    technical =
      Math.min(
        100,
        completed.length * 5
      );

  }


  /*
   * Project tasks
   */

  const projectTasks =
    all.filter(
      task =>
        ccNormalizeCategory(
          task.category
        ) === "project"
    );


  const projectCompleted =
    projectTasks.filter(
      task =>
        ccIsTaskComplete(
          task.id
        )
    );


  let projects;


  if (
    projectTasks.length
  ) {

    projects =
      Math.round(
        projectCompleted.length /
        projectTasks.length *
        100
      );

  } else {

    projects =
      0;

  }


  /*
   * Consistency
   */

  const consistency =
    Math.min(
      100,
      completed.length * 8
    );


  return {

    overall,

    technical:
      Math.max(
        0,
        Math.min(
          100,
          technical
        )
      ),

    projects:
      Math.max(
        0,
        Math.min(
          100,
          projects
        )
      ),

    consistency:
      Math.max(
        0,
        Math.min(
          100,
          consistency
        )
      )

  };

}


/* =========================================================
   COMPLETE DASHBOARD STATS
========================================================= */

function ccGetStats() {

  const tasks =
    ccGetAllTasks();


  const completed =
    ccGetCompletedTasks();


  const remaining =
    ccGetIncompleteTasks();


  return {

    total:
      tasks.length,

    completed:
      completed.length,

    remaining:
      remaining.length,

    progress:
      ccGetProgress(),

    completedMinutes:
      ccGetCompletedMinutes(),

    totalMinutes:
      ccGetTotalPlannedMinutes(),

    remainingMinutes:
      ccGetRemainingMinutes(),

    projects:
      ccGetCompletedProjects(),

    totalProjects:
      ccGetTotalProjects(),

    skills:
      ccGetSkillProgress()

  };

}


/* =========================================================
   AI CONTEXT
========================================================= */

function ccGetAIContext() {

  const student =
    ccGetStudent();


  const plan =
    ccGetPlan();


  const tasks =
    ccGetAllTasks();


  const completed =
    ccGetCompletedTasks();


  const remainingTasks =
    ccGetIncompleteTasks();


  const progress =
    ccGetProgress();


  const minutes =
    ccGetCompletedMinutes();


  const projects =
    ccGetCompletedProjects();


  const skills =
    ccGetSkillProgress();


  return {

    student,

    plan,

    tasks,

    completed,

    remainingTasks,

    progress,

    minutes,

    projects,

    skills,

    remaining:
      remainingTasks.length

  };

}


/* =========================================================
   AI RESPONSE ENGINE
========================================================= */

function ccAIReply(
  message
) {

  const input =
    String(
      message || ""
    )
    .trim()
    .toLowerCase();


  const context =
    ccGetAIContext();


  const student =
    context.student;


  const name =
    student?.name ||
    "there";


  if (!student) {

    return {

      text:
        "I'd be happy to help. Start by creating your CampusCompass journey so I can personalize my recommendations.",

      action:
        "onboarding"

    };

  }


  /*
   * Progress
   */

  if (
    input.includes("progress") ||
    input.includes("how am i doing")
  ) {

    return {

      text:
        `You're currently ${context.progress}% through your plan. You've completed ${context.completed.length} of ${context.tasks.length} tasks and logged ${context.minutes} minutes.`,

      action:
        "progress"

    };

  }


  /*
   * Next task
   */

  if (
    input.includes("next") ||
    input.includes("what should i do") ||
    input.includes("what do i do")
  ) {

    const nextTask =
      context.remainingTasks[0];


    if (!nextTask) {

      return {

        text:
          `You've completed every task in your current plan, ${name}! Review your progress and decide what you want to tackle next.`,

        action:
          "progress"

      };

    }


    return {

      text:
        `Your next task is "${nextTask.title}". It takes about ${nextTask.duration || 0} minutes and is part of ${nextTask.category || "your plan"}.`,

      action:
        "planner"

    };

  }


  /*
   * Projects
   */

  if (
    input.includes("project")
  ) {

    return {

      text:
        `You've completed ${context.projects} project${context.projects === 1 ? "" : "s"} so far. Keep using project work to turn your learning into something tangible.`,

      action:
        "planner"

    };

  }


  /*
   * Time
   */

  if (
    input.includes("time") ||
    input.includes("minutes") ||
    input.includes("today")
  ) {

    const dailyTime =
      student.dailyTime ||
      student.time ||
      60;


    return {

      text:
        `You have about ${dailyTime} minutes of learning time available each day. You've completed ${context.minutes} minutes so far.`,

      action:
        "planner"

    };

  }


  /*
   * Goals
   */

  if (
    input.includes("goal") ||
    input.includes("career") ||
    input.includes("internship")
  ) {

    return {

      text:
        `Your current goal is ${student.goal || "personal growth"}. Your plan is designed around ${student.course || "your field"} and your available study time.`,

      action:
        "planner"

    };

  }


  /*
   * Skills
   */

  if (
    input.includes("skill") ||
    input.includes("learn") ||
    input.includes("technical")
  ) {

    const nextTask =
      context.remainingTasks[0];


    return {

      text:
        nextTask

          ? `Focus on "${nextTask.title}" next. Consistent practice is more useful than trying to learn everything at once.`

          : "You've completed the current skill-building tasks. Check your progress page to see what you've accomplished.",

      action:
        nextTask
          ? "planner"
          : "progress"

    };

  }


  /*
   * Greeting
   */

  if (
    input.includes("hello") ||
    input.includes("hi") ||
    input.includes("hey")
  ) {

    return {

      text:
        `Hey ${name}! 👋 I can help you understand your progress, choose your next task, review your goals, or plan your study time.`,

      action:
        null

    };

  }


  /*
   * Empty / generic
   */

  return {

    text:
      `I can help you with your progress, next task, projects, skills, goals, or study time. Try asking "What should I do next?"`,

    action:
      null

  };

}


/* =========================================================
   CROSS-PAGE SYNC
========================================================= */

function ccNotifyChange() {

  /*
   * Same-page event.
   */

  try {

    window.dispatchEvent(
      new CustomEvent(
        "campusCompassUpdated",
        {
          detail: {
            timestamp:
              Date.now()
          }
        }
      )
    );

  } catch(error) {

    console.warn(
      "CampusCompass event error:",
      error
    );

  }


  /*
   * Storage event cannot be manually
   * dispatched to other tabs reliably.
   *
   * Therefore a small sync timestamp
   * is stored separately.
   */

  try {

    localStorage.setItem(
      "campusCompassSync",
      String(
        Date.now()
      )
    );

  } catch(error) {

    console.warn(
      "CampusCompass sync error:",
      error
    );

  }

}


/* =========================================================
   STORAGE EVENT
========================================================= */

window.addEventListener(
  "storage",
  event => {

    if (
      event.key ===
      "campusCompassSync"
    ) {

      window.dispatchEvent(
        new CustomEvent(
          "campusCompassUpdated",
          {
            detail: {
              external: true
            }
          }
        )
      );

      return;

    }


    if (
      Object.values(
        CAMPUS_KEYS
      )
      .includes(
        event.key
      )
    ) {

      window.dispatchEvent(
        new CustomEvent(
          "campusCompassUpdated",
          {
            detail: {
              key:
                event.key,

              external:
                true
            }
          }
        )
      );

    }

  }
);


/* =========================================================
   CUSTOM EVENT
========================================================= */

window.addEventListener(
  "campusCompassUpdated",
  () => {

    if (
      typeof window.refreshCampusCompass ===
      "function"
    ) {

      try {

        window.refreshCampusCompass();

      } catch(error) {

        console.warn(
          "CampusCompass refresh error:",
          error
        );

      }

    }

  }
);


/* =========================================================
   ESCAPE HTML
========================================================= */

function ccEscapeHTML(
  value
) {

  return String(
    value ?? ""
  )
  .replaceAll(
    "&",
    "&amp;"
  )
  .replaceAll(
    "<",
    "&lt;"
  )
  .replaceAll(
    ">",
    "&gt;"
  )
  .replaceAll(
    '"',
    "&quot;"
  )
  .replaceAll(
    "'",
    "&#039;"
  );

}


/* =========================================================
   PUBLIC REFRESH
========================================================= */

function ccRefresh() {

  window.dispatchEvent(
    new CustomEvent(
      "campusCompassUpdated"
    )
  );

}


/* =========================================================
   DEBUG / DATA INSPECTION
========================================================= */

function ccGetAllData() {

  return {

    student:
      ccGetStudent(),

    plan:
      ccGetPlan(),

    taskState:
      ccGetTaskState(),

    stats:
      ccGetStats()

  };

}


/* =========================================================
   CLEAR ALL DATA
========================================================= */

function ccClearAllData() {

  try {

    Object.values(
      CAMPUS_KEYS
    ).forEach(
      key => {

        localStorage.removeItem(
          key
        );

      }
    );


    localStorage.removeItem(
      "campusCompassSync"
    );


    ccNotifyChange();


    return true;

  } catch(error) {

    console.warn(
      "CampusCompass clear error:",
      error
    );

    return false;

  }

}


/* =========================================================
   INITIALIZE
========================================================= */

ccInitialize();
