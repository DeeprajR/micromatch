import { formToObject } from "../ui.js";

let mode = "signin";
let signupRole = "volunteer";

export function renderAuth(container) {
  container.innerHTML = `
    <section class="auth-card" aria-labelledby="authTitle">
      <div class="brand-row">
        <span class="brand-mark"><svg><use href="#icon-logo"></use></svg></span>
        <div>
          <p class="label">Micro-volunteer matching</p>
          <h1 id="authTitle">MicroMatch</h1>
        </div>
      </div>
      <p class="auth-copy">Find meaningful volunteer tasks that fit into 15 to 90 minute pockets of time.</p>
      <div class="segmented" data-auth-tabs role="tablist" aria-label="Authentication mode">
        <button class="${mode === "signin" ? "active" : ""}" data-auth-mode="signin" type="button">Sign in</button>
        <button class="${mode === "signup" ? "active" : ""}" data-auth-mode="signup" type="button">Sign up</button>
      </div>
      ${mode === "signin" ? renderSignInForm() : renderSignUpForm()}
      <p class="fine-print">Passwords are sent to the backend only. The browser stores an opaque session token.</p>
    </section>
  `;
}

export function bindAuth(container, { api, onAuthenticated, showToast }) {
  container.addEventListener("click", async (event) => {
    const authButton = event.target.closest("[data-auth-mode]");
    if (authButton) {
      mode = authButton.dataset.authMode;
      renderAuth(container);
      return;
    }

    const roleButton = event.target.closest("[data-signup-role]");
    if (roleButton) {
      signupRole = roleButton.dataset.signupRole;
      renderAuth(container);
      return;
    }

  });

  container.addEventListener("submit", async (event) => {
    const form = event.target.closest("form");
    if (!form) return;
    event.preventDefault();

    try {
      if (form.dataset.authForm === "signin") {
        await onAuthenticated(await api.signIn(formToObject(form)));
      } else {
        await onAuthenticated(await api.signUp({ ...formToObject(form), role: signupRole }));
      }
    } catch (error) {
      showToast(error.message);
    }
  });
}

function renderSignInForm() {
  return `
    <form class="auth-form" data-auth-form="signin">
      <label class="field">
        <span>Email</span>
        <input name="email" autocomplete="email" required type="email" placeholder="volunteer@example.com" />
      </label>
      <label class="field">
        <span>Password</span>
        <input name="password" autocomplete="current-password" required type="password" placeholder="password" />
      </label>
      <button class="primary-action wide" type="submit">Sign in</button>
    </form>
  `;
}

function renderSignUpForm() {
  return `
    <form class="auth-form" data-auth-form="signup">
      <div class="segmented role-picker" role="tablist" aria-label="Account type">
        <button class="${signupRole === "volunteer" ? "active" : ""}" data-signup-role="volunteer" type="button">
          <svg><use href="#icon-user"></use></svg>Volunteer
        </button>
        <button class="${signupRole === "nonprofit" ? "active" : ""}" data-signup-role="nonprofit" type="button">
          <svg><use href="#icon-building"></use></svg>Nonprofit
        </button>
      </div>
      <label class="field">
        <span>Name</span>
        <input name="name" autocomplete="name" required placeholder="Avery Kim" />
      </label>
      <label class="field">
        <span>Email</span>
        <input name="email" autocomplete="email" required type="email" placeholder="you@example.com" />
      </label>
      <label class="field">
        <span>Password</span>
        <input name="password" autocomplete="new-password" required minlength="4" type="password" placeholder="At least 4 characters" />
      </label>
      ${signupRole === "volunteer" ? renderVolunteerFields() : renderNonprofitFields()}
      <button class="primary-action wide" type="submit">Create account</button>
    </form>
  `;
}

function renderVolunteerFields() {
  return `
    <label class="field">
      <span>Skills</span>
      <input name="skills" placeholder="Writing, Design, Tutoring" />
    </label>
    <label class="field">
      <span>Causes</span>
      <input name="causes" placeholder="Education, Food Access" />
    </label>
    <label class="field">
      <span>Availability</span>
      <input name="availability" placeholder="Weeknights, Weekends" />
    </label>
    <label class="field">
      <span>Qualifications</span>
      <input name="qualifications" placeholder="Spanish, background check, CPR" />
    </label>
    <div class="form-row">
      <label class="field">
        <span>Phone</span>
        <input name="phone" placeholder="Optional" />
      </label>
      <label class="field">
        <span>Task length</span>
        <select name="preferredMinutes">
          <option value="30">Up to 30 minutes</option>
          <option value="60">Up to 60 minutes</option>
          <option value="90">Up to 90 minutes</option>
        </select>
      </label>
    </div>
    <div class="form-row">
      <label class="field">
        <span>Format</span>
        <select name="format">
          <option>Remote</option>
          <option>In-person</option>
          <option>Either</option>
        </select>
      </label>
      <span></span>
    </div>
  `;
}

function renderNonprofitFields() {
  return `
    <label class="field">
      <span>Organization</span>
      <input name="organizationName" placeholder="Community Impact Hub" />
    </label>
    <label class="field">
      <span>Mission</span>
      <textarea name="mission" rows="3" placeholder="What community need do you serve?"></textarea>
    </label>
    <div class="form-row">
      <label class="field">
        <span>Website</span>
        <input name="website" placeholder="https://example.org" />
      </label>
      <label class="field">
        <span>Location</span>
        <input name="location" placeholder="Remote or city" />
      </label>
    </div>
  `;
}
