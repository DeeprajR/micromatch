const { hashPassword } = require("../utils/security");

function demoUser({ id, name, email, role, salt, createdAt }) {
  const password = hashPassword("password", salt);
  return {
    id,
    name,
    email,
    role,
    passwordSalt: password.salt,
    passwordHash: password.hash,
    createdAt
  };
}

function createSeedData() {
  return {
    users: [
      demoUser({
        id: "user_vol_avery",
        name: "Avery Kim",
        email: "volunteer@example.com",
        role: "volunteer",
        salt: "volunteer-demo-salt",
        createdAt: "2026-09-18T10:00:00.000Z"
      }),
      demoUser({
        id: "user_np_maya",
        name: "Maya Patel",
        email: "nonprofit@example.com",
        role: "nonprofit",
        salt: "nonprofit-demo-salt",
        createdAt: "2026-09-18T10:05:00.000Z"
      })
    ],
    sessions: [],
    volunteerProfiles: [
      {
        userId: "user_vol_avery",
        skills: ["Design", "Tutoring", "Translation", "Writing"],
        causes: ["Education", "Food Access", "Digital Access"],
        preferredMinutes: [15, 30, 60],
        format: "Remote",
        availability: ["Weeknights", "Weekends"],
        phone: "",
        qualifications: ["Spanish translation", "Student mentoring"]
      }
    ],
    organizations: [
      {
        id: "org_bridge_food",
        ownerId: "user_np_maya",
        name: "Bridge Food Network",
        mission: "Help families find reliable food support nearby.",
        website: "https://bridgefood.example",
        location: "Remote and local",
        verified: true,
        createdAt: "2026-09-18T10:10:00.000Z"
      },
      {
        id: "org_brightsteps",
        ownerId: "user_np_maya",
        name: "BrightSteps Tutoring",
        mission: "Support first-generation students with academic and career readiness.",
        website: "",
        location: "Remote",
        verified: true,
        createdAt: "2026-09-18T10:11:00.000Z"
      },
      {
        id: "org_open_path",
        ownerId: "user_np_maya",
        name: "Open Path Library",
        mission: "Improve public access to digital services.",
        website: "",
        location: "Remote",
        verified: true,
        createdAt: "2026-09-18T10:12:00.000Z"
      }
    ],
    tasks: [
      {
        id: "task_food_flyer",
        organizationId: "org_bridge_food",
        title: "Translate a food assistance flyer",
        description: "Translate a one-page pantry access flyer from English to Spanish and flag unclear wording.",
        cause: "Food Access",
        skills: ["Translation", "Writing"],
        minutes: 45,
        deadline: "2026-09-24",
        locationType: "Remote",
        location: "Online",
        volunteersNeeded: 2,
        applicationLimit: 6,
        impact: "Help 120 families understand where to pick up weekly groceries.",
        instructions: "Use the shared document comments for questions and submit the translated copy before the deadline.",
        status: "open",
        approvalRequired: false,
        urgency: 5,
        createdAt: "2026-09-16T09:00:00.000Z"
      },
      {
        id: "task_resume_review",
        organizationId: "org_brightsteps",
        title: "Review a student resume guide",
        description: "Read a four-page worksheet and suggest clearer examples for first-generation college applicants.",
        cause: "Education",
        skills: ["Writing", "Tutoring"],
        minutes: 60,
        deadline: "2026-09-26",
        locationType: "Remote",
        location: "Online",
        volunteersNeeded: 1,
        applicationLimit: 5,
        impact: "Improve materials used by 35 seniors preparing college and internship applications.",
        instructions: "Leave comments in the draft and summarize the three highest-priority edits.",
        status: "open",
        approvalRequired: true,
        urgency: 4,
        createdAt: "2026-09-15T14:30:00.000Z"
      },
      {
        id: "task_accessibility_test",
        organizationId: "org_open_path",
        title: "Test a library signup page",
        description: "Check a public computer signup flow on desktop and mobile, then report confusing steps.",
        cause: "Digital Access",
        skills: ["Research", "UX Testing"],
        minutes: 30,
        deadline: "2026-09-27",
        locationType: "Remote",
        location: "Online",
        volunteersNeeded: 4,
        applicationLimit: 8,
        impact: "Make digital services easier for residents without home internet access.",
        instructions: "Complete the checklist and attach screenshots for any blocking issue.",
        status: "open",
        approvalRequired: false,
        urgency: 3,
        createdAt: "2026-09-18T08:45:00.000Z"
      },
      {
        id: "task_housing_notes",
        organizationId: "org_bridge_food",
        title: "Write donor thank-you notes",
        description: "Personalize short thank-you messages for supporters who funded emergency pantry kits.",
        cause: "Food Access",
        skills: ["Writing", "Community Outreach"],
        minutes: 30,
        deadline: "2026-09-25",
        locationType: "In-person",
        location: "Downtown community room",
        volunteersNeeded: 5,
        applicationLimit: 10,
        impact: "Strengthen support for pantry kits distributed to 40 neighbors this month.",
        instructions: "Use the message prompts and first names only. Staff will review notes before mailing.",
        status: "open",
        approvalRequired: false,
        urgency: 3,
        createdAt: "2026-09-14T12:20:00.000Z"
      }
    ],
    savedTasks: [
      {
        id: "saved_seed_resume",
        userId: "user_vol_avery",
        taskId: "task_resume_review",
        createdAt: "2026-09-19T11:00:00.000Z"
      }
    ],
    messages: [],
    signups: [
      {
        id: "signup_seed_complete",
        taskId: "task_accessibility_test",
        volunteerId: "user_vol_avery",
        status: "confirmed",
        signedUpAt: "2026-09-18T13:30:00.000Z",
        completedAt: "2026-09-18T14:05:00.000Z",
        confirmedAt: "2026-09-18T16:00:00.000Z",
        actualMinutes: 35,
        completionNote: "Submitted screenshots and three accessibility notes."
      }
    ],
    notifications: [
      {
        id: "note_avery_welcome",
        recipientId: "user_vol_avery",
        title: "Welcome back",
        message: "Your profile is ready and new micro-tasks are available.",
        createdAt: "2026-09-20T09:00:00.000Z"
      },
      {
        id: "note_maya_welcome",
        recipientId: "user_np_maya",
        title: "Bridge Food Network is live",
        message: "Your nonprofit workspace is ready for task posting and volunteer confirmation.",
        createdAt: "2026-09-20T09:05:00.000Z"
      }
    ]
  };
}

module.exports = { createSeedData };
