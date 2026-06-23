"use client";

import { FormEvent, useState } from "react";

type FormState = "idle" | "loading" | "success" | "error";

export function ContactForm() {
  const [state, setState] = useState<FormState>("idle");

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setState("loading");
    window.setTimeout(() => {
      const form = event.currentTarget;
      const data = new FormData(form);
      setState(data.get("email") ? "success" : "error");
      if (data.get("email")) form.reset();
    }, 500);
  }

  return (
    <form className="grid gap-4" onSubmit={submit}>
      <div className="grid gap-4 md:grid-cols-2">
        <label className="grid gap-2">
          <span className="eyebrow text-[var(--color-muted)]">Name</span>
          <input className="border border-[var(--color-line)] bg-transparent px-3 py-3 outline-none focus:border-[var(--color-accent)]" name="name" required />
        </label>
        <label className="grid gap-2">
          <span className="eyebrow text-[var(--color-muted)]">Email</span>
          <input className="border border-[var(--color-line)] bg-transparent px-3 py-3 outline-none focus:border-[var(--color-accent)]" name="email" type="email" required />
        </label>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <label className="grid gap-2">
          <span className="eyebrow text-[var(--color-muted)]">Company</span>
          <input className="border border-[var(--color-line)] bg-transparent px-3 py-3 outline-none focus:border-[var(--color-accent)]" name="company" />
        </label>
        <label className="grid gap-2">
          <span className="eyebrow text-[var(--color-muted)]">Project Type</span>
          <select className="border border-[var(--color-line)] bg-[var(--color-bg)] px-3 py-3 outline-none focus:border-[var(--color-accent)]" name="projectType">
            <option>Website</option>
            <option>Brand</option>
            <option>UI Product</option>
            <option>Motion</option>
            <option>Campaign</option>
          </select>
        </label>
      </div>
      <label className="grid gap-2">
        <span className="eyebrow text-[var(--color-muted)]">Message</span>
        <textarea className="min-h-40 border border-[var(--color-line)] bg-transparent px-3 py-3 outline-none focus:border-[var(--color-accent)]" name="message" required />
      </label>
      {state === "error" ? <p className="text-sm text-red-600">Please add a valid email before sending.</p> : null}
      {state === "success" ? <p className="text-sm text-[var(--color-muted)]">Message captured in the demo state. Wire this to the server action before production.</p> : null}
      <button className="btn btn-primary w-fit" type="submit" disabled={state === "loading"}>
        {state === "loading" ? "Sending" : "Send message"}
      </button>
    </form>
  );
}
