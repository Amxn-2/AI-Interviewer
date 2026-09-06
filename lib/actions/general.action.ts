"use server";

import { generateObject, generateText } from "ai";
import { google } from "@ai-sdk/google";
import { z } from "zod";

import { db } from "@/firebase/admin";
import { feedbackSchema } from "@/constants";
import { getRandomInterviewCover } from "@/lib/utils";

export async function createInterview(params: {
  userId: string;
  transcript: { role: string; content: string }[];
}) {
  const { userId, transcript } = params;

  try {
    const formattedTranscript = transcript
      .map((s) => `${s.role}: ${s.content}`)
      .join("\n");

    // Step 1: Extract structured interview params from the conversation transcript
    const { object: interviewParams } = await generateObject({
      model: google("gemini-2.0-flash-001", { structuredOutputs: false }),
      schema: z.object({
        role: z.string().describe("The job role the candidate is preparing for"),
        level: z
          .enum(["Junior", "Mid", "Senior"])
          .describe("Experience level"),
        techstack: z
          .string()
          .describe(
            "Comma-separated list of technologies, languages, or tools"
          ),
        type: z
          .enum(["Technical", "Behavioral", "Mixed"])
          .describe("Type of interview"),
        amount: z
          .number()
          .min(5)
          .max(15)
          .describe("Number of interview questions requested"),
      }),
      prompt: `You are extracting structured data from a conversation transcript where a user was setting up a mock interview.\n\nTranscript:\n${formattedTranscript}\n\nExtract the following fields from the conversation:\n- role: the job role/position the user wants to be interviewed for\n- level: the experience level (Junior, Mid, or Senior)\n- techstack: the relevant technologies/tools as a comma-separated string\n- type: the interview type (Technical, Behavioral, or Mixed)\n- amount: the number of questions requested (default to 5 if not mentioned)\n\nUse sensible defaults if the user didn't clearly specify a field.`,
      system:
        "Extract structured interview configuration from the given conversation transcript.",
    });

    // Step 2: Generate interview questions using the extracted params
    const { text: questionsRaw } = await generateText({
      model: google("gemini-2.0-flash-001"),
      prompt: `Prepare questions for a job interview.
        The job role is ${interviewParams.role}.
        The job experience level is ${interviewParams.level}.
        The tech stack used in the job is: ${interviewParams.techstack}.
        The focus between behavioural and technical questions should lean towards: ${interviewParams.type}.
        The amount of questions required is: ${interviewParams.amount}.
        Please return only the questions, without any additional text.
        The questions are going to be read by a voice assistant so do not use "/" or "*" or any other special characters which might break the voice assistant.
        Return the questions formatted like this:
        ["Question 1", "Question 2", "Question 3"]

        Thank you! <3
    `,
    });

    // Step 3: Save the interview to Firestore
    const interview = {
      role: interviewParams.role,
      type: interviewParams.type,
      level: interviewParams.level,
      techstack: interviewParams.techstack.split(",").map((t) => t.trim()),
      questions: JSON.parse(questionsRaw),
      userId,
      finalized: true,
      coverImage: getRandomInterviewCover(),
      createdAt: new Date().toISOString(),
    };

    await db.collection("interviews").add(interview);

    return { success: true };
  } catch (error) {
    console.error("Error creating interview:", error);
    return { success: false };
  }
}

export async function createFeedback(params: CreateFeedbackParams) {
  const { interviewId, userId, transcript, feedbackId } = params;

  try {
    const formattedTranscript = transcript
      .map(
        (sentence: { role: string; content: string }) =>
          `- ${sentence.role}: ${sentence.content}\n`
      )
      .join("");

    const { object } = await generateObject({
      model: google("gemini-2.0-flash-001", {
        structuredOutputs: false,
      }),
      schema: feedbackSchema,
      prompt: `
        You are an AI interviewer analyzing a mock interview. Your task is to evaluate the candidate based on structured categories. Be thorough and detailed in your analysis. Don't be lenient with the candidate. If there are mistakes or areas for improvement, point them out.
        Transcript:
        ${formattedTranscript}

        Please score the candidate from 0 to 100 in the following areas. Do not add categories other than the ones provided:
        - **Communication Skills**: Clarity, articulation, structured responses.
        - **Technical Knowledge**: Understanding of key concepts for the role.
        - **Problem-Solving**: Ability to analyze problems and propose solutions.
        - **Cultural & Role Fit**: Alignment with company values and job role.
        - **Confidence & Clarity**: Confidence in responses, engagement, and clarity.
        `,
      system:
        "You are a professional interviewer analyzing a mock interview. Your task is to evaluate the candidate based on structured categories",
    });

    const feedback = {
      interviewId: interviewId,
      userId: userId,
      totalScore: object.totalScore,
      categoryScores: object.categoryScores,
      strengths: object.strengths,
      areasForImprovement: object.areasForImprovement,
      finalAssessment: object.finalAssessment,
      createdAt: new Date().toISOString(),
    };

    let feedbackRef;

    if (feedbackId) {
      feedbackRef = db.collection("feedback").doc(feedbackId);
    } else {
      feedbackRef = db.collection("feedback").doc();
    }

    await feedbackRef.set(feedback);

    return { success: true, feedbackId: feedbackRef.id };
  } catch (error) {
    console.error("Error saving feedback:", error);
    return { success: false };
  }
}

export async function getInterviewById(id: string): Promise<Interview | null> {
  const interview = await db.collection("interviews").doc(id).get();

  return interview.data() as Interview | null;
}

export async function getFeedbackByInterviewId(
  params: GetFeedbackByInterviewIdParams
): Promise<Feedback | null> {
  const { interviewId, userId } = params;

  const querySnapshot = await db
    .collection("feedback")
    .where("interviewId", "==", interviewId)
    .where("userId", "==", userId)
    .limit(1)
    .get();

  if (querySnapshot.empty) return null;

  const feedbackDoc = querySnapshot.docs[0];
  return { id: feedbackDoc.id, ...feedbackDoc.data() } as Feedback;
}

export async function getLatestInterviews(
  params: GetLatestInterviewsParams
): Promise<Interview[] | null> {
  const { userId, limit = 20 } = params;

  const interviews = await db
    .collection("interviews")
    .orderBy("createdAt", "desc")
    .where("finalized", "==", true)
    .where("userId", "!=", userId)
    .limit(limit)
    .get();

  return interviews.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  })) as Interview[];
}

export async function getInterviewsByUserId(
  userId: string
): Promise<Interview[] | null> {
  const interviews = await db
    .collection("interviews")
    .where("userId", "==", userId)
    .orderBy("createdAt", "desc")
    .get();

  return interviews.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  })) as Interview[];
}