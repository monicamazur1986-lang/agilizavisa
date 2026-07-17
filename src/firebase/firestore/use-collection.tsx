
'use client';

import { useEffect, useState } from 'react';
import { onSnapshot, Query, QuerySnapshot, DocumentData } from 'firebase/firestore';
import { errorEmitter } from '../error-emitter';
import { FirestorePermissionError } from '../errors';

/**
 * @fileOverview HOOK DE COLEÇÃO COM BLINDAGEM CONTRA FALHAS DE CONTEXTO.
 */

export function useCollection<T = DocumentData>(query: Query<T> | null) {
  const [data, setData] = useState<T[] | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!query) {
      setLoading(false);
      return;
    }

    const unsubscribe = onSnapshot(query, 
      (snapshot: QuerySnapshot<T>) => {
        setData(snapshot.docs.map(doc => doc.data()));
        setLoading(false);
      },
      async (error) => {
        const permissionError = new FirestorePermissionError({
          path: 'collection',
          operation: 'list',
        });
        errorEmitter.emit('permission-error', permissionError);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [query]);

  return { data, loading };
}
