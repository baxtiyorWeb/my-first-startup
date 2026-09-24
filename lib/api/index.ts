import * as auth from "./auth";
import * as posts from "./posts";
import * as comments from "./comments";
import * as users from "./users";
import * as bookmarks from "./bookmarks";
import * as search from "./search";
import * as reports from "./reports";
import * as upload from "./upload";

export { ApiError } from "./client";

export const api = {
  auth,
  posts,
  comments,
  users,
  bookmarks,
  search,
  reports,
  upload,
};

export default api;
