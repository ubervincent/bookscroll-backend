import { Column, PrimaryGeneratedColumn, ManyToMany, Entity, JoinTable, ManyToOne} from "typeorm";
import { Theme } from "./theme.entity";
import { Book } from "./book.entity";

@Entity()
export class Snippet {
    @PrimaryGeneratedColumn()
    id?: number;

    @Column()
    startSentence: number;

    @Column()
    endSentence: number;

    @Column()
    snippetText: string;

    @Column()
    reason: string;

    @ManyToMany(() => Theme, { cascade: true },)
    @JoinTable()
    themes: Theme[];

    @ManyToOne(() => Book, (book) => book.id, { onDelete: 'CASCADE' })
    book: Book;

    @Column()
    sentenceText: string;
}