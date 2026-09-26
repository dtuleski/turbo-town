/// A single Memory Match card.
class MemoryCard {
  MemoryCard({
    required this.id,
    required this.value,
    this.isFlipped = false,
    this.isMatched = false,
  });

  final String id;
  final String value;
  bool isFlipped;
  bool isMatched;

  MemoryCard copyWith({bool? isFlipped, bool? isMatched}) {
    return MemoryCard(
      id: id,
      value: value,
      isFlipped: isFlipped ?? this.isFlipped,
      isMatched: isMatched ?? this.isMatched,
    );
  }
}
