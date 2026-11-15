import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, useCallback, useContext, useEffect, useMemo, useReducer, type ReactNode } from 'react';

import type { ItemForm } from './item-form';
import { deletePaperPhotos } from './paper-photos';
import type { Item, Paper, Teacher } from './types';

/**
 * On-device store. Records stay private to the teacher on this phone (spec §2, §9).
 * If storage fails, scoring still works and results are kept in memory for this session
 * ("local mode", spec §8).
 */
const STORAGE_KEY = 'sol/state/v2';

export interface ItemDraftState {
  /** Item being edited, or null for a new one. */
  itemId: string | null;
  form: ItemForm;
}

interface PersistedState {
  teacher: Teacher | null;
  items: Item[];
  papers: Paper[];
  activeItemId: string | null;
  /** Section stays filled between papers. */
  lastSection: string;
  draft: ItemDraftState | null;
}

export type StorageStatus = 'loading' | 'saved' | 'error';

interface State extends PersistedState {
  hydrated: boolean;
  storage: StorageStatus;
}

type Action =
  | { type: 'hydrate'; state: Partial<PersistedState> | null; ok: boolean }
  | { type: 'storage'; status: StorageStatus }
  | { type: 'patch'; patch: Partial<PersistedState> }
  | { type: 'teacher'; patch: Partial<Teacher> & Pick<Teacher, 'lastActive'> }
  | { type: 'upsertItem'; item: Item }
  | { type: 'upsertPaper'; paper: Paper }
  | { type: 'deletePaper'; id: string };

const initialState: State = {
  hydrated: false,
  storage: 'loading',
  teacher: null,
  items: [],
  papers: [],
  activeItemId: null,
  lastSection: '',
  draft: null,
};

function pickPersisted(saved: Partial<PersistedState> | null): Partial<PersistedState> {
  if (!saved) return {};
  const { teacher, items, activeItemId, lastSection, draft } = saved;
  // Papers made by the old simulated (demo) checker had random scores: they are not real results.
  const papers = saved.papers?.filter((p) => !(p as { demo?: boolean }).demo);
  const out: Partial<PersistedState> = { teacher, items, papers, activeItemId, lastSection, draft };
  for (const k of Object.keys(out) as (keyof PersistedState)[]) if (out[k] === undefined) delete out[k];
  return out;
}

function upsert<T extends { id: string }>(list: T[], next: T) {
  const i = list.findIndex((x) => x.id === next.id);
  if (i === -1) return [next, ...list];
  const copy = list.slice();
  copy[i] = next;
  return copy;
}

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case 'hydrate':
      // Drop fields and demo papers older versions saved.
      return {
        ...initialState,
        ...pickPersisted(action.state),
        hydrated: true,
        storage: action.ok ? 'saved' : 'error',
      };
    case 'storage':
      return state.storage === action.status ? state : { ...state, storage: action.status };
    case 'patch':
      return { ...state, ...action.patch };
    case 'teacher':
      // Merge, so editing the name keeps the photo (and vice versa).
      return { ...state, teacher: { teacherName: '', subject: '', ...state.teacher, ...action.patch } };
    case 'upsertItem':
      // Most recently saved first.
      return { ...state, items: [action.item, ...state.items.filter((i) => i.id !== action.item.id)] };
    case 'upsertPaper':
      return { ...state, papers: upsert(state.papers, action.paper) };
    case 'deletePaper':
      return { ...state, papers: state.papers.filter((p) => p.id !== action.id) };
  }
}

interface Store extends State {
  activeItem: Item | null;
  setTeacher: (teacher: Pick<Teacher, 'teacherName' | 'subject'> & Pick<Partial<Teacher>, 'gradeLevel'>) => void;
  /**
   * Without `synced`, the photo is a local change still to be uploaded. With it, the photo
   * matches what Supabase holds at `photoPath` (after an upload or download).
   */
  setTeacherPhoto: (photo: string | null, synced?: { photoPath: string | null }) => void;
  clearTeacher: () => void;
  saveItem: (item: Item) => void;
  setActiveItem: (id: string | null) => void;
  setDraft: (draft: ItemDraftState | null) => void;
  setLastSection: (section: string) => void;
  savePaper: (paper: Paper) => void;
  deletePaper: (id: string) => void;
}

const StoreContext = createContext<Store | null>(null);

export function StoreProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, initialState);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY)
      .then((raw) => dispatch({ type: 'hydrate', state: raw ? JSON.parse(raw) : null, ok: true }))
      .catch(() => dispatch({ type: 'hydrate', state: null, ok: false }));
  }, []);

  const { hydrated, teacher, items, papers, activeItemId, lastSection, draft } = state;

  // Persist after hydration, debounced so rapid edits don't thrash storage.
  useEffect(() => {
    if (!hydrated) return;
    const timer = setTimeout(() => {
      const data: PersistedState = { teacher, items, papers, activeItemId, lastSection, draft };
      AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(data))
        .then(() => dispatch({ type: 'storage', status: 'saved' }))
        .catch(() => dispatch({ type: 'storage', status: 'error' }));
    }, 250);
    return () => clearTimeout(timer);
  }, [hydrated, teacher, items, papers, activeItemId, lastSection, draft]);

  const setTeacher = useCallback(
    (t: Pick<Teacher, 'teacherName' | 'subject'> & Pick<Partial<Teacher>, 'gradeLevel'>) =>
      dispatch({ type: 'teacher', patch: { ...t, lastActive: Date.now() } }),
    []
  );
  const setTeacherPhoto = useCallback(
    (photo: string | null, synced?: { photoPath: string | null }) =>
      dispatch({
        type: 'teacher',
        patch: synced
          ? { photo, photoPath: synced.photoPath, photoDirty: false, lastActive: Date.now() }
          : { photo, photoDirty: true, lastActive: Date.now() },
      }),
    []
  );
  /** On sign-out, so the next account on this phone starts from its own profile. */
  const clearTeacher = useCallback(() => dispatch({ type: 'patch', patch: { teacher: null } }), []);
  const saveItem = useCallback((item: Item) => dispatch({ type: 'upsertItem', item }), []);
  const setActiveItem = useCallback(
    (id: string | null) => dispatch({ type: 'patch', patch: { activeItemId: id } }),
    []
  );
  const setDraft = useCallback(
    (d: ItemDraftState | null) => dispatch({ type: 'patch', patch: { draft: d } }),
    []
  );
  const setLastSection = useCallback(
    (section: string) => dispatch({ type: 'patch', patch: { lastSection: section } }),
    []
  );
  const savePaper = useCallback((paper: Paper) => dispatch({ type: 'upsertPaper', paper }), []);
  const deletePaper = useCallback((id: string) => {
    deletePaperPhotos(id);
    dispatch({ type: 'deletePaper', id });
  }, []);

  const activeItem = useMemo(
    () => (activeItemId ? (items.find((i) => i.id === activeItemId) ?? null) : null),
    [items, activeItemId]
  );

  const value = useMemo<Store>(
    () => ({
      ...state,
      activeItem,
      setTeacher,
      setTeacherPhoto,
      clearTeacher,
      saveItem,
      setActiveItem,
      setDraft,
      setLastSection,
      savePaper,
      deletePaper,
    }),
    [
      state,
      activeItem,
      setTeacher,
      setTeacherPhoto,
      clearTeacher,
      saveItem,
      setActiveItem,
      setDraft,
      setLastSection,
      savePaper,
      deletePaper,
    ]
  );

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useStore() {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error('useStore must be used inside <StoreProvider>');
  return ctx;
}
