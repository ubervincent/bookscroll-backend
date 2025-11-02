import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';
import { Snippet } from './snippet.entity';
import { OneToMany, JoinTable } from 'typeorm';
@Entity()
export class Book {
    @PrimaryGeneratedColumn()
    id?: number;

    @Column({ nullable: true })
    title?: string;

    @Column({ nullable: true })
    author?: string;

    @Column({ type: 'jsonb' })
    sentences: Record<number, string>;

    @Column({ nullable: true })
    status?: 'processing' | 'completed' | 'failed';

    @Column({ nullable: true })
    userId?: string;

    @OneToMany(() => Snippet, (snippet) => snippet.book, { cascade: true })
    @JoinTable()
    snippets: Snippet[];
}