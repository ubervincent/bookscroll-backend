import { Injectable, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createClient } from '@supabase/supabase-js';

@Injectable()
export class SupabaseService implements OnModuleInit {
  private supabase;

  constructor(private config: ConfigService) {}

  onModuleInit() {
    const supabaseUrl = this.config.get<string>('SUPABASE_URL');
    const supabaseKey = this.config.get<string>('SUPABASE_KEY');
    
    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Missing Supabase configuration: SUPABASE_URL and SUPABASE_KEY must be set');
    }

    this.supabase = createClient(supabaseUrl, supabaseKey);
  }

  async getUser(token: string) {
    const { data } = await this.supabase.auth.getUser(token);
    return data.user;
  }
}

