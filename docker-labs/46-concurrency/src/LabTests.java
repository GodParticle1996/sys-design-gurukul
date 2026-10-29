import java.util.*;
import java.util.concurrent.*;
import java.util.concurrent.atomic.*;

final class LabTests {
    static int checks;
    static void check(boolean condition, String message) {
        LabSupport.require(condition, message);
        checks++;
    }

    static void run() throws Exception {
        RaceLab race = new RaceLab();
        check(race.lostUpdate() == 1, "Forced interleaving must lose one update");
        check(race.withMutex() == 2, "Mutex must preserve both updates");
        check(RaceLab.withAtomic() == 2, "Atomic increment must preserve both updates");
        check(RaceLab.reentrant().equals("holds=2 -> 1 -> 0"), "Nested lock requires balanced releases");
        check(!RaceLab.otherKeyCanEnter(true) && RaceLab.otherKeyCanEnter(false), "Lock scope must affect independent key");
        check(RaceLab.immutableSnapshot(), "Snapshot must reject mutation and resist source-list changes");

        QueueLab.Result queue = QueueLab.exercise(false);
        check(queue.fullSize() == 2 && queue.rejected(), "Full queue must refuse nonwaiting offer");
        check(queue.order().equals(List.of("A", "B", "C")) && queue.empty(), "Blocking queue must preserve FIFO without loss");
        QueueLab.Buffer<Integer> buffer = new QueueLab.Buffer<>(1);
        buffer.put(1);
        AtomicBoolean inserted = new AtomicBoolean();
        Thread waiter = new Thread(() -> {
            try { buffer.put(2); inserted.set(true); }
            catch (InterruptedException expected) { Thread.currentThread().interrupt(); }
        });
        waiter.setDaemon(true); waiter.start();
        try {
            LabSupport.until(() -> buffer.waitingProducers() == 1, "Producer never awaited");
            buffer.signalWithoutSpace();
            LabSupport.until(() -> buffer.waits() >= 2 && buffer.waitingProducers() == 1, "Signal did not recheck full queue");
            check(!inserted.get() && buffer.size() == 1, "Signal alone must not permit insertion");
            waiter.interrupt(); LabSupport.join(waiter);
            check(!inserted.get() && buffer.take() == 1 && buffer.offer(3), "Interrupted put must neither insert nor retain lock");
        } finally { waiter.interrupt(); LabSupport.join(waiter); }

        QueueLab.Buffer<Integer> empty = new QueueLab.Buffer<>(1);
        AtomicInteger received = new AtomicInteger();
        Thread consumer = new Thread(() -> {
            try { received.set(empty.take()); }
            catch (InterruptedException expected) { Thread.currentThread().interrupt(); }
        });
        consumer.setDaemon(true); consumer.start();
        try {
            LabSupport.until(() -> consumer.getState() == Thread.State.WAITING, "Consumer did not await data");
            empty.put(9); LabSupport.join(consumer);
            check(received.get() == 9, "Empty-queue consumer must resume on actual data");
        } finally { consumer.interrupt(); LabSupport.join(consumer); }

        PoolLab.Pool pool = new PoolLab.Pool(2);
        PoolLab.Lease a = pool.borrow(0), b = pool.borrow(0);
        check(a != null && b != null && a.id != b.id && pool.borrow(1) == null, "Resource IDs must be distinct; exhausted pool times out");
        a.close(); a.close();
        check(pool.available() == 1 && pool.freeCount() == 1, "Duplicate close must not inflate permits/free IDs");
        b.close();
        try (PoolLab.Lease failed = pool.borrow(0)) {
            throw new IllegalStateException("query failed");
        } catch (IllegalStateException expected) {
            check(pool.available() == 2, "Failure must return resource through close");
        }
        ExecutorService borrowers = Executors.newFixedThreadPool(6);
        Set<Integer> heldIds = ConcurrentHashMap.newKeySet();
        AtomicInteger active = new AtomicInteger(), peak = new AtomicInteger();
        CountDownLatch acquired = new CountDownLatch(2), release = new CountDownLatch(1);
        try {
            List<Future<?>> futures = new ArrayList<>();
            for (int i = 0; i < 6; i++) futures.add(borrowers.submit(() -> {
                try (PoolLab.Lease lease = pool.borrow(2000)) {
                    LabSupport.require(lease != null, "Concurrent borrow timed out");
                    LabSupport.require(heldIds.add(lease.id), "Same connection leased to two active borrowers");
                    int now = active.incrementAndGet(); peak.accumulateAndGet(now, Math::max);
                    try { acquired.countDown(); LabSupport.await(release); }
                    finally { active.decrementAndGet(); heldIds.remove(lease.id); }
                } catch (InterruptedException e) { throw new RuntimeException(e); }
            }));
            LabSupport.await(acquired);
            check(pool.available() == 0 && peak.get() == 2, "Two simultaneous borrowers must exhaust capacity");
            release.countDown();
            for (Future<?> future : futures) future.get(3, TimeUnit.SECONDS);
            check(peak.get() == 2 && pool.available() == 2 && pool.freeCount() == 2, "Concurrent cleanup must conserve capacity");
        } finally {
            release.countDown(); borrowers.shutdownNow();
            LabSupport.require(borrowers.awaitTermination(3, TimeUnit.SECONDS), "Borrower cleanup deadline");
        }

        check(DeadlockLab.broken(), "Must detect our two-thread deadlock, then stop both threads");
        check(DeadlockLab.ordered() == 2, "Consistent order must complete both tasks");
        WorkersLab.Result unbounded = WorkersLab.executor(false), bounded = WorkersLab.executor(true);
        check(unbounded.equals(new WorkersLab.Result(2, 3, 0, 5)), "Unbounded queue must hold third waiting task");
        check(bounded.equals(new WorkersLab.Result(2, 2, 1, 4)), "Bounded executor must explicitly reject fifth task");
        check(WorkersLab.duplicateBroken() == 2, "ConcurrentMap get+put must still allow duplicate effect");
        WorkersLab.Dedup dedup = WorkersLab.duplicateFixed();
        check(dedup.effects.get() == 1 && dedup.orders.size() == 1, "Concurrent same-key requests must apply one local effect");
        boolean conflict = false;
        try { dedup.execute("payment-7", "changed"); }
        catch (IllegalArgumentException expected) { conflict = true; }
        check(conflict && dedup.effects.get() == 1, "Payload conflict must not execute new effect");
        check(dedup.execute("payment-8", "100 INR").equals("order-2"), "Different key remains independent");
        System.out.println(checks + " concurrency behavior checks pass");
    }
}
