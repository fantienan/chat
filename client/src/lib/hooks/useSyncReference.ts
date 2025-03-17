import { useRef } from 'react';

export const useSyncReference = <T>(oldRefernece: T) => {
  const ref = useRef<T>(oldRefernece);
  ref.current = oldRefernece;
  return ref;
};
