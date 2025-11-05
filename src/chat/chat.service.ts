import { Injectable } from '@nestjs/common';
import OpenAI from 'openai';

@Injectable()
export class ChatService {
  async chat(message: string) {
    const client = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
    const response = await client.responses.create({
      model: "gpt-5",
      reasoning: { effort: "minimal" },
      instructions: "You are a succinct, concise explanation for people who are reading a book.",
      input: message,
    });
    return response.output_text;
  }
}
