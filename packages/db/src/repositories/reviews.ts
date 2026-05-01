import type { CreateReviewInput, Review } from "../types";

const TODO_MESSAGE = "TODO(Window B): connect reviews repository to Supabase.";

export async function createReview(input: CreateReviewInput): Promise<Review> {
  throw new Error(`${TODO_MESSAGE} createReview is not implemented yet.`);
}

export const reviewsRepository = {
  createReview,
};
