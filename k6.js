import http from "k6/http";
import { check } from "k6";

const query = `{ hello }`;
const variables = {};
const extensions = {};

const headers = {
  "Content-Type": "application/json",
};

export default function () {
  const res = http.post(
    "http://localhost:4000/",
    JSON.stringify({
      query: query,
      variables: variables,
      extensions: extensions,
    }),
    { headers: headers }
  );

  check(res, {
    "is status 200": (r) => r.status === 200,
  });

  const body = JSON.parse(res.body);
  check(body, {
    "without errors": (b) => b.errors == null,
  });
}
