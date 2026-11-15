import type { FeedbackLanguage, ItemKind } from './types';

/**
 * Ready-made comments the teacher taps while scoring. Each is a full sentence addressed to the
 * learner, so the selected ones read as feedback on their own.
 */
export interface CommentBank {
  strengths: string[];
  improvements: string[];
}

/** Languages the ready-made comments come in. */
export const COMMENT_LANGUAGES = ['English', 'Filipino'] as const satisfies readonly FeedbackLanguage[];
export type CommentLanguage = (typeof COMMENT_LANGUAGES)[number];

const BANKS: Record<CommentLanguage, Record<ItemKind, CommentBank>> = {
  English: {
    essay: {
      strengths: [
        'You answered the question directly.',
        'Your ideas are clear and easy to follow.',
        'You gave good examples.',
        'Your essay has a clear beginning, middle and end.',
        'Your grammar and spelling are mostly correct.',
        'You chose your words well.',
      ],
      improvements: [
        'Answer the question more directly.',
        'Add more examples to support your ideas.',
        'Organize your ideas into a clear beginning, middle and end.',
        'Check your grammar and spelling.',
        'Write more to reach the required length.',
        'Write more neatly so your answer is easy to read.',
      ],
    },
    math: {
      strengths: [
        'You understood what the problem is asking.',
        'You showed your complete solution.',
        'Your computations are correct.',
        'Your final answer is correct and labeled.',
      ],
      improvements: [
        'Write what is given and what is asked.',
        'Show every step of your solution.',
        'Check your computations carefully.',
        'Include the unit or label in your final answer.',
        'Review the correct method for this kind of problem.',
      ],
    },
  },
  Filipino: {
    essay: {
      strengths: [
        'Direktang sinagot mo ang tanong.',
        'Malinaw at madaling sundan ang iyong mga ideya.',
        'Nagbigay ka ng magagandang halimbawa.',
        'May malinaw na simula, gitna at wakas ang iyong sanaysay.',
        'Halos tama ang iyong gramatika at baybay.',
        'Angkop ang mga salitang ginamit mo.',
      ],
      improvements: [
        'Sagutin nang mas direkta ang tanong.',
        'Magdagdag ng mga halimbawa upang suportahan ang iyong mga ideya.',
        'Ayusin ang mga ideya sa malinaw na simula, gitna at wakas.',
        'Suriin ang iyong gramatika at baybay.',
        'Sumulat pa nang mas mahaba upang maabot ang hinihinging haba.',
        'Isulat nang mas malinis upang madaling mabasa ang iyong sagot.',
      ],
    },
    math: {
      strengths: [
        'Naunawaan mo ang hinihingi ng problema.',
        'Ipinakita mo ang buong solusyon.',
        'Tama ang iyong mga kompyutasyon.',
        'Tama ang iyong huling sagot at may yunit o label.',
      ],
      improvements: [
        'Isulat kung ano ang ibinigay at ano ang hinihingi.',
        'Ipakita ang bawat hakbang ng iyong solusyon.',
        'Suriing mabuti ang iyong mga kompyutasyon.',
        'Isama ang yunit o label sa iyong huling sagot.',
        'Balikan ang tamang paraan sa ganitong uri ng problema.',
      ],
    },
  },
};

/** Older items may hold a language from the AI checker's list; those get English comments. */
export function commentLanguage(lang: FeedbackLanguage | string): CommentLanguage {
  return lang === 'Filipino' ? 'Filipino' : 'English';
}

export function commentBank(kind: ItemKind, lang: FeedbackLanguage | string): CommentBank {
  return BANKS[commentLanguage(lang)][kind];
}

/**
 * Feedback for the learner: what the teacher typed, or, if nothing was typed, the tapped
 * comments joined into one paragraph (strengths first).
 */
export function composeFeedback(typed: string, strengths: string[], improvements: string[]) {
  const text = typed.trim();
  if (text) return text;
  return [...strengths, ...improvements].join(' ');
}
