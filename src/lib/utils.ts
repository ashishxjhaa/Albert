import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const getAvatarByUserInitials = (name: string) => {
  if (name.length === 0) {
    throw new Error("Name is required to create an avatar");
  }
  return `https://api.dicebear.com/9.x/initials/svg?seed=${name}&scale=100`;
};

export const capitalizeFirstLetter = (word: string): string => {
  if (!word) return "";
  return `${word.at(0)!.toUpperCase()}${word.slice(1).toLowerCase()}`;
};

export function getSlug(str: string) {
  let value = str.replace(/^\s+|\s+$/g, "");
  value = value.toLowerCase();

  const from = "àáäâèéëêìíïîòóöôùúüûñç·/_,:;";
  const to = "aaaaeeeeiiiioooouuuunc------";
  for (let i = 0, l = from.length; i < l; i++) {
    value = value.replace(new RegExp(from.charAt(i), "g"), to.charAt(i));
  }

  value = value
    .replace(/[^a-z0-9 -]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");

  return value;
}

export const delay = (ms: number) => new Promise((res) => setTimeout(res, ms));
