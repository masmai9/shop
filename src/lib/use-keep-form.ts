"use client";

import { startTransition, type FormEvent } from "react";

/**
 * React 19 clears uncontrolled form fields after a `<form action={...}>`
 * submit — even when the server returns an error, so the user loses what they
 * typed. Use `onSubmit={keepForm(dispatch)}` instead of `action={dispatch}`
 * to submit without the automatic reset.
 */
export function keepForm(dispatch: (form: FormData) => void) {
  return (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const data = new FormData(e.currentTarget);
    startTransition(() => dispatch(data));
  };
}
