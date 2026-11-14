import test from "node:test";
import assert from "node:assert/strict";
import { AuthApiError, AuthRetryableFetchError, AuthSessionMissingError } from "@supabase/supabase-js";
import { authRequestError, failure } from "../../src/lib/api-server";

test("identity-provider outages are retryable503, not invalid guest401", async () => {
  for (const upstream of [new AuthRetryableFetchError("fetch failed",0),new AuthRetryableFetchError("timeout",504),new AuthApiError("rate limited",429,"over_request_rate_limit"),new AuthApiError("upstream failure",500,"unexpected_failure")]) {
    const response=failure(authRequestError(upstream));
    assert.equal(response.status,503);
    assert.equal((await response.json()).error.code,"SERVICE_UNAVAILABLE");
  }
});

test("authoritative invalid/missing-session errors remain401", async () => {
  for (const upstream of [new AuthApiError("invalid JWT",401,"bad_jwt"),new AuthApiError("user missing",403,"user_not_found"),new AuthSessionMissingError()]) {
    const response=failure(authRequestError(upstream));
    assert.equal(response.status,401);
    assert.equal((await response.json()).error.code,"SESSION_REQUIRED");
  }
});
