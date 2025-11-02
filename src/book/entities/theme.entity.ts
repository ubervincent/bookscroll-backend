import { Column, Entity, PrimaryGeneratedColumn, ManyToMany } from "typeorm";
import { Snippet } from "./snippet.entity";

@Entity()
export class Theme {
    @PrimaryGeneratedColumn()
    id?: number;

    @Column({ unique: true })
    name: string;

    @Column({ nullable: true })
    userId?: string;
    
    @ManyToMany(() => Snippet, (snippet) => snippet.themes)
    snippets: Snippet[];
}