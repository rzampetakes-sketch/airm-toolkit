// A tiny shared, mutable session object. main.js populates `session.user`
// once at startup (or after login/logout); every other module imports this
// same object reference, so they always see the current value live.
export const session = {
  user: null, // { id, companyId, fullName, email, role } | null
};

export function isLoggedInClient() {
  return Boolean(session.user && session.user.role === 'client');
}
