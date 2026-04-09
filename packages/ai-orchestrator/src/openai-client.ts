import OpenAI from "openai";
import { zodTextFormat } from "openai/helpers/zod";
import type { ZodType } from "zod";

export type StructuredTextModel = {
  parse<Output>(params: {
    model: string;
    schema: ZodType<Output>;
    schemaName: string;
    systemPrompt: string;
    userPrompt: string;
  }): Promise<Output>;
};

export class OpenAIResponsesStructuredModel implements StructuredTextModel {
  constructor(private readonly client: OpenAI) {}

  async parse<Output>({
    model,
    schema,
    schemaName,
    systemPrompt,
    userPrompt
  }: {
    model: string;
    schema: ZodType<Output>;
    schemaName: string;
    systemPrompt: string;
    userPrompt: string;
  }): Promise<Output> {
    const response = await this.client.responses.parse({
      model,
      input: [
        {
          role: "system",
          content: systemPrompt
        },
        {
          role: "user",
          content: userPrompt
        }
      ],
      text: {
        format: zodTextFormat(schema, schemaName)
      }
    });

    if (!response.output_parsed) {
      throw new Error("OpenAI returned no parsed structured output.");
    }

    return schema.parse(response.output_parsed);
  }
}

export function createOpenAIStructuredModel(apiKey: string) {
  return new OpenAIResponsesStructuredModel(
    new OpenAI({
      apiKey
    })
  );
}
