import { useSelector, TypedUseSelectorHook } from 'react-redux';
import type { RootState } from '../types';

/** Pre-typed selector hook — avoids casting everywhere */
const useAppSelector: TypedUseSelectorHook<RootState> = useSelector;
export default useAppSelector;
