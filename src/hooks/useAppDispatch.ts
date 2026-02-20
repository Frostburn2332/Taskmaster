import { useDispatch } from 'react-redux';
import type { AppDispatch } from '../store/store';

/** Pre-typed dispatch hook — avoids casting everywhere */
const useAppDispatch = () => useDispatch<AppDispatch>();
export default useAppDispatch;
