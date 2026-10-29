import java.util.*;
import java.util.concurrent.*;
import java.util.concurrent.atomic.AtomicReference;
import java.util.concurrent.locks.*;

final class QueueLab {
    static final class Buffer<T> {
        private final int capacity;
        private final ArrayDeque<T> items = new ArrayDeque<>();
        private final ReentrantLock lock = new ReentrantLock();
        private final Condition notFull = lock.newCondition();
        private final Condition notEmpty = lock.newCondition();
        private int waits;

        Buffer(int capacity) {
            if (capacity < 1) throw new IllegalArgumentException("capacity must be positive");
            this.capacity = capacity;
        }

        void put(T item) throws InterruptedException {
            Objects.requireNonNull(item);
            lock.lockInterruptibly();
            try {
                while (items.size() == capacity) {
                    waits++;
                    notFull.await();
                }
                items.addLast(item);
                notEmpty.signal();
            } finally {
                lock.unlock();
            }
        }

        T take() throws InterruptedException {
            lock.lockInterruptibly();
            try {
                while (items.isEmpty()) notEmpty.await();
                T item = items.removeFirst();
                notFull.signal();
                return item;
            } finally {
                lock.unlock();
            }
        }

        // No waiting for capacity/data. The short bookkeeping lock can still contend.
        boolean offer(T item) {
            Objects.requireNonNull(item);
            lock.lock();
            try {
                if (items.size() == capacity) return false;
                items.addLast(item);
                notEmpty.signal();
                return true;
            } finally { lock.unlock(); }
        }

        T poll() {
            lock.lock();
            try {
                T item = items.pollFirst();
                if (item != null) notFull.signal();
                return item;
            } finally { lock.unlock(); }
        }

        int size() {
            lock.lock();
            try { return items.size(); }
            finally { lock.unlock(); }
        }

        int waitingProducers() {
            lock.lock();
            try { return lock.getWaitQueueLength(notFull); }
            finally { lock.unlock(); }
        }

        int waits() {
            lock.lock();
            try { return waits; }
            finally { lock.unlock(); }
        }

        void signalWithoutSpace() {
            lock.lock();
            try { notFull.signalAll(); }
            finally { lock.unlock(); }
        }
    }

    record Result(int fullSize, boolean rejected, List<String> order, boolean empty) {}

    static Result exercise(boolean print) throws InterruptedException {
        Buffer<String> queue = new Buffer<>(2);
        queue.put("A"); queue.put("B");
        boolean rejected = !queue.offer("X");
        AtomicReference<Throwable> error = new AtomicReference<>();
        Thread producer = new Thread(() -> {
            try { queue.put("C"); }
            catch (Throwable e) { error.set(e); }
        }, "producer-C");
        producer.setDaemon(true);
        producer.start();
        try {
            LabSupport.until(() -> queue.waitingProducers() == 1, "Producer did not await space");
            int fullSize = queue.size();
            if (print) System.out.println("full: size=" + fullSize + " producer=WAITING offer(X)=" + !rejected);
            List<String> order = new ArrayList<>();
            order.add(queue.take());
            LabSupport.join(producer);
            LabSupport.require(error.get() == null, "Producer failed: " + error.get());
            order.add(queue.take()); order.add(queue.take());
            boolean empty = queue.poll() == null;
            if (print) {
                System.out.println("after take(A): producer resumed; remaining=" + String.join(",", order.subList(1, 3)));
                System.out.println("received=" + String.join(",", order) + " empty poll=" + queue.poll());
            }
            return new Result(fullSize, rejected, List.copyOf(order), empty);
        } finally {
            producer.interrupt(); LabSupport.join(producer);
        }
    }

    static void run() throws InterruptedException {
        System.out.println("ASLI JAVA THREADS; capacity=2, ek producer C ke liye rukta hai");
        ArrayDeque<String> unchecked = new ArrayDeque<>();
        for (int i = 1; i <= 5; i++) unchecked.addLast("job-" + i);
        System.out.println("broken unbounded intake: waiting=" + unchecked.size() + " consumer abhi shuru nahi hua");
        exercise(true);
    }
}
